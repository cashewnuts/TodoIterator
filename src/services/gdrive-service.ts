import { loadScript } from './network-service'
import { promisify } from 'util'
import { createLogger } from './logger'
import { v4 as uuidv4 } from 'uuid'
const logger = createLogger({ filename: 'gdrive-service.ts' })

const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
]
const scope = 'https://www.googleapis.com/auth/drive.appdata'

const APP_DATA_FOLDER = 'appDataFolder'
const COMMON_RESOURCE_OPTIONS = {
  kind: 'drive#file',
  parents: [APP_DATA_FOLDER],
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

  async load() {
    return this.initPromise
  }

  async signIn() {
    const googleUser = await gapi.auth2.getAuthInstance().signIn()
    this._isSignedIn = googleUser.isSignedIn()
    logger.debug('signIn', this._isSignedIn, googleUser)
    return this._isSignedIn
  }

  async list() {
    const data = await gapi.client.drive.files.list({
      spaces: APP_DATA_FOLDER,
      pageSize: 100,
    })
    logger.debug('list', data)
    return data
  }

  async get({ fileId }: { fileId: string }) {
    return await gapi.client.drive.files.get({
      fileId,
      alt: 'media',
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
    const path =
      'https://www.googleapis.com/upload/drive/v3/files' + (id ? `/${id}` : '')
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
    return await gapi.client.request({
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
