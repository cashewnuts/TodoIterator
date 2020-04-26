import { loadScript } from './network-service'
import { promisify } from 'util'
import { createLogger } from './logger'
const logger = createLogger({ filename: 'gdrive-service.ts' })

const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
]
const scope = 'https://www.googleapis.com/auth/drive.appdata'

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
    try {
      const data = await gapi.client.drive.files.list({
        spaces: 'appDataFolder',
        pageSize: 100,
      })
      logger.debug('list', data)
      return data
    } catch (err) {
      logger.error('Error on drive.files.list', err)
    }
  }
}
