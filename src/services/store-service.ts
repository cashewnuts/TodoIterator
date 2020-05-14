import GdriveProvider from './providers/gdrive-provider'
import { db } from './local-db'
import Task, { ITask, TASK_ROOT_ID } from '../models/task'
import { createLogger } from './logger'
import { EventEmitter } from 'events'
import { INITIATED } from '../constants/store-event'
import { LAST_SYNCED } from '../constants/local-storage'
const logger = createLogger({ filename: 'store-service.ts' })

export enum StoreFile {
  DOING = 'todo-list-doing',
  ARCHIVED = 'archived-todo-list',
  DELETED = 'deleted-todo-list',
  STATE = 'todo-state',
}

export default class StoreService {
  loadGapiPromise: Promise<void>
  fileMap: Map<
    StoreFile,
    {
      fileId: string
      modifiedAt: number
      content?: string
    }
  >
  constructor(
    private gdriveProvider: GdriveProvider,
    private storeEvent: EventEmitter
  ) {
    this.loadGapiPromise = gdriveProvider.loadScript()
    this.fileMap = new Map()
  }

  public get isSignedIn() {
    return this.gdriveProvider.isSignedIn
  }

  public async ready() {
    await this.loadGapiPromise
    return this.isSignedIn
  }

  public async init() {
    const isReady = await this.ready()
    if (!isReady) return
    await this.initFileMap()
    await this.loadInitialContent()
    localStorage.setItem(LAST_SYNCED, '' + Date.now())
    this.storeEvent.emit(INITIATED)
  }

  public reset() {
    localStorage.removeItem(LAST_SYNCED)
  }

  public havePassedSinceLastSync(milliSec: number) {
    const lastLoadedTime = parseInt(
      localStorage.getItem(LAST_SYNCED) || '0',
      10
    )
    return lastLoadedTime + milliSec < Date.now()
  }

  public async sync() {
    const isReady = await this.ready()
    const doingMeta = this.fileMap.get(StoreFile.DOING)
    if (!isReady || !doingMeta) return
    const cloudDoing = await this.gdriveProvider.getMeta({
      fileId: doingMeta.fileId,
    })
    if (
      new Date(cloudDoing.result.modifiedTime || 0).getTime() >
      doingMeta.modifiedAt
    ) {
      logger.debug('load before sync', cloudDoing, doingMeta)
      await this.init()
    }
    await this.saveDoings(doingMeta.fileId)
    localStorage.setItem(LAST_SYNCED, '' + Date.now())
  }

  public async login() {
    await this.gdriveProvider.signIn()
  }

  public async logout() {
    await this.sync()
    await this.gdriveProvider.signOut()
    await db.tasks.toCollection().delete()
    this.reset()
  }

  private async loadInitialContent() {
    // Assume DOING fileId exists
    const doingId = this.fileMap.get(StoreFile.DOING)?.fileId as string
    const doingContent = await this.getFile(doingId)
    logger.info(doingContent)
    if (doingContent instanceof Array) {
      const modifiedTasks = await Promise.all(
        doingContent.map(async (task: ITask) => {
          if (!task.id) return
          const localTask = await db.tasks.get(task.id)
          if (localTask instanceof Task) {
            if ((localTask.updatedAt || 0) < (task.updatedAt || 0)) {
              logger.info('put', task, localTask.id)
              return new Task(task)
            }
          } else {
            const t = new Task(task)
            await t.save()
            return t
          }
        })
      )
      const parentMap = modifiedTasks
        .filter((x): x is Task => x !== undefined)
        .reduce<{ [key: string]: (string | Task)[] }>((acc, task: Task) => {
          if (task.id === TASK_ROOT_ID) {
            return acc
          }
          const parentId = task.parent || TASK_ROOT_ID
          if (!acc[parentId]) {
            acc[parentId] = []
          }
          acc[parentId].push(task)
          return acc
        }, {})
      await Promise.all(
        Object.keys(parentMap).map(async (parentId) => {
          const children = parentMap[parentId]
          const parentTask = await db.tasks.get(parentId)
          if (parentTask instanceof Task) {
            await parentTask.saveChildren(children)
          }
        })
      )
      await this.saveDoings(doingId)
    }
  }

  private async saveDoings(fileId: string) {
    const tasks = await db.tasks.toArray()
    const createResponse = await this.gdriveProvider.create({
      id: fileId,
      name: StoreFile.DOING,
      content: JSON.stringify(tasks),
    })
    const { modifiedTime } = createResponse.result
    const before = this.fileMap.get(StoreFile.DOING)
    this.fileMap.set(StoreFile.DOING, {
      ...before,
      fileId,
      modifiedAt: new Date(modifiedTime).getTime(),
    })
    logger.info('create', createResponse)
  }

  private async createFile(
    name: string,
    content: string | { [key: string]: unknown }
  ) {
    const response = await this.gdriveProvider.create({
      name,
      content,
    })
    logger.info(
      'createFile',
      response.status,
      response.statusText,
      response.headers,
      response.body
    )
    return response.result
  }

  private async getFile(fileId: string) {
    const response = await this.gdriveProvider.getFile({
      fileId,
    })
    logger.info(
      'getFile',
      response.status,
      response.statusText,
      response.headers,
      response.body
    )
    return response.result
  }

  private async initFileMap() {
    const { result } = await this.gdriveProvider.list()
    const { files } = result
    const initOrCreateId = async (
      filename: StoreFile,
      files?: gapi.client.drive.File[]
    ) => {
      if (!files || files.length === 0) {
        const createResponse = await this.createFile(
          filename,
          JSON.stringify([])
        )
        return {
          id: createResponse.id,
          modifiedAt: new Date(createResponse.modifiedTime).getTime(),
        }
      }
      const todoMeta = files.find((f) => f.name === filename)
      if (!todoMeta) {
        const createResponse = await this.createFile(
          filename,
          JSON.stringify([])
        )
        return {
          id: createResponse.id,
          modifiedAt: new Date(createResponse.modifiedTime).getTime(),
        }
      }
      logger.debug('gdrive file meta', todoMeta)
      return {
        id: todoMeta.id as string,
        modifiedAt: todoMeta.modifiedTime
          ? new Date(todoMeta.modifiedTime).getTime()
          : Date.now(),
      }
    }
    const [doing, archived, deleted, state] = await Promise.all([
      await initOrCreateId(StoreFile.DOING, files),
      await initOrCreateId(StoreFile.ARCHIVED, files),
      await initOrCreateId(StoreFile.DELETED, files),
      await initOrCreateId(StoreFile.STATE, files),
    ])
    this.fileMap.set(StoreFile.DOING, {
      fileId: doing.id,
      modifiedAt: doing.modifiedAt,
    })
    this.fileMap.set(StoreFile.ARCHIVED, {
      fileId: archived.id,
      modifiedAt: archived.modifiedAt,
    })
    this.fileMap.set(StoreFile.DELETED, {
      fileId: deleted.id,
      modifiedAt: deleted.modifiedAt,
    })
    this.fileMap.set(StoreFile.STATE, {
      fileId: state.id,
      modifiedAt: state.modifiedAt,
    })
    logger.debug('initFileMap: fileIdMap', this.fileMap)
  }
}
