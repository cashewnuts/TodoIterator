import { loadScript, makeQueryString } from '../helpers/network-helper'
import { promisify } from 'util'
import { createLogger } from '../logger'
import { v4 as uuidv4 } from 'uuid'
const logger = createLogger({ filename: 'gdrive-provider.ts' })

const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
]
const scope = 'https://www.googleapis.com/auth/drive.appdata'

const APP_DATA_FOLDER = 'appDataFolder'
const COMMON_RESOURCE_OPTIONS = {
  kind: 'drive#file',
  parents: [APP_DATA_FOLDER],
}

export interface CreateResponse {
  kind: string
  id: string
  name: string
  mimeType: string
  modifiedTime: string
}

export default class GdriveService {
  private initPromise: Promise<void>
  private _isSignedIn = false
  get isSignedIn() {
    return this._isSignedIn
  }
  constructor() {
    this.initPromise = this.load3dPartyScript()
    this.initPromise.then(() => {
      // Listen for sign-in state changes.
      gapi.auth2.getAuthInstance().isSignedIn.listen((isSignedIn) => {
        this._isSignedIn = isSignedIn
      })
    })
  }

  async load3dPartyScript() {
    try {
      await loadScript('https://apis.google.com/js/api.js')
      const load = promisify(gapi.load)
      await load('client')
      await this.start()
    } catch (err) {
      logger.error('Error on gdrive init')
    }
  }

  async start() {
    await gapi.client.init({
      apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
      // Your API key will be automatically added to the Discovery Document URLs.
      discoveryDocs: DISCOVERY_DOCS,
      // clientId and scope are optional if auth is not required.
      clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
      scope,
    })
    this._isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get()
  }

  async loadScript() {
    if (!this.initPromise) {
      this.initPromise = this.load3dPartyScript()
    }
    return this.initPromise
  }

  async signIn() {
    const googleUser = await gapi.auth2.getAuthInstance().signIn()
    this._isSignedIn = googleUser.isSignedIn()
    logger.debug('signIn', this._isSignedIn, googleUser)
    return this._isSignedIn
  }

  async signOut() {
    await gapi.auth2.getAuthInstance().signOut()
    this._isSignedIn = false
    logger.debug('signOut', this._isSignedIn)
  }

  async list() {
    try {
      const data = await gapi.client.drive.files.list({
        fields: 'files(id, name, mimeType, modifiedTime)',
        spaces: APP_DATA_FOLDER,
        pageSize: 100,
      })
      logger.debug('list', data)
      return data
    } catch (err) {
      const { error } = err.result
      logger.error('list', error.message, error.errors)
      throw err
    }
  }

  async getFile({ fileId }: { fileId: string }) {
    return await gapi.client.drive.files.get({
      fileId,
      alt: 'media',
    })
  }

  async getMeta({ fileId }: { fileId: string }) {
    return await gapi.client.drive.files.get({
      fields: 'id, name, mimeType, modifiedTime',
      fileId,
    })
  }

  async create({
    id,
    name,
    content,
    mimeType,
  }: {
    id?: string
    name: string
    content: string | { [key: string]: unknown }
    mimeType?: string
  }) {
    const method = id ? 'PATCH' : 'POST'
    const query = makeQueryString({
      fields: 'id,name,mimeType,modifiedTime',
    })
    const path = `https://www.googleapis.com/upload/drive/v3/files/${
      id ? id : ''
    }?${query}`
    let metadata = {
      name,
    }
    if (!id) {
      metadata = {
        ...COMMON_RESOURCE_OPTIONS,
        ...metadata,
      }
    }
    const boundary = `-------${uuidv4()}`
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelimiter = `\r\n--${boundary}--`
    let multipartRequestBody = ''
    multipartRequestBody += delimiter
    multipartRequestBody +=
      'Content-Type: application/json; charset=UTF-8\r\n\r\n'
    multipartRequestBody += JSON.stringify(metadata)
    multipartRequestBody += delimiter
    multipartRequestBody += `Content-Type: ${
      mimeType || 'text/plain'
    }; charset=UTF-8\r\n\r\n`
    multipartRequestBody +=
      typeof content === 'string' ? content : JSON.stringify(content)
    multipartRequestBody += closeDelimiter
    return await gapi.client.request<CreateResponse>({
      path,
      params: {
        uploadType: 'multipart',
      },
      headers: {
        'Content-Type': `multipart/mixed; boundary="${boundary}"`,
      },
      method,
      body: multipartRequestBody,
    })
  }
}
