import GdriveProvider from './providers/gdrive-provider'
import { db } from './local-db'
import Task, { ITask, TASK_ROOT_ID } from '../models/task'
import { createLogger } from './logger'
import { EventEmitter } from 'events'
import { INITIATED } from '../constants/store-event'
const logger = createLogger({ filename: 'store-service.ts' })

export enum StoreFile {
  DOING = 'todo-list-doing',
  ARCHIVED = 'archived-todo-list',
  DELETED = 'deleted-todo-list',
  STATE = 'todo-state',
}

export default class StoreService {
  loadPromise: Promise<void>
  fileMap: Map<
    StoreFile,
    {
      fileId: string
      content?: string
    }
  >
  constructor(
    private gdriveProvider: GdriveProvider,
    private storeEvent: EventEmitter
  ) {
    this.loadPromise = gdriveProvider.load()
    this.fileMap = new Map()
  }

  public get isSignedIn() {
    return this.gdriveProvider.isSignedIn
  }

  async ready() {
    await this.loadPromise
    return this.isSignedIn
  }

  async init() {
    const isReady = await this.ready()
    if (!isReady) return
    await this.initFileMap()
    await this.loadInitialContent()
    this.storeEvent.emit(INITIATED)
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
      const tasks = await db.tasks.toArray()
      const createResponse = await this.gdriveProvider.create({
        id: doingId,
        name: StoreFile.DOING,
        content: JSON.stringify(tasks),
      })
      logger.info('create', createResponse)
    }
  }

  async createFile(name: string, content: string | { [key: string]: unknown }) {
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

  async getFile(fileId: string) {
    const response = await this.gdriveProvider.get({
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
        return createResponse.id
      }
      const todoMeta = files.find((f) => f.name === filename)
      if (!todoMeta) {
        const createResponse = await this.createFile(
          filename,
          JSON.stringify([])
        )
        return createResponse.id
      }
      return todoMeta.id as string
    }
    const [doing, archived, deleted, state] = await Promise.all([
      await initOrCreateId(StoreFile.DOING, files),
      await initOrCreateId(StoreFile.ARCHIVED, files),
      await initOrCreateId(StoreFile.DELETED, files),
      await initOrCreateId(StoreFile.STATE, files),
    ])
    this.fileMap.set(StoreFile.DOING, {
      fileId: doing,
    })
    this.fileMap.set(StoreFile.ARCHIVED, {
      fileId: archived,
    })
    this.fileMap.set(StoreFile.DELETED, {
      fileId: deleted,
    })
    this.fileMap.set(StoreFile.STATE, {
      fileId: state,
    })
    logger.debug('initFileMap: fileIdMap', this.fileMap)
  }
}
