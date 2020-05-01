import { db } from '../services/local-db'
import { v4 as uuidv4 } from 'uuid'
import { createLogger } from '../services/logger'
import _uniq from 'lodash/uniq'
const logger = createLogger({ filename: 'task.ts' })

export const TASK_ROOT_ID = 'root-task-id'

export interface ITask {
  id?: string
  name: string
  parent?: string
  children: string[]
  description: string
  isDone: boolean
  createdAt?: number
  updatedAt?: number
}

export default class Task implements ITask {
  id?: string
  name: string
  description: string
  children: string[]
  isDone: boolean
  createdAt: number
  updatedAt: number
  parent?: string

  constructor({
    name,
    description,
    children,
    isDone = false,
    id = uuidv4(),
    parent,
    createdAt = Date.now(),
    updatedAt = Date.now(),
  }: ITask) {
    this.name = name
    this.description = description
    this.children = children
    this.isDone = isDone
    this.createdAt = createdAt
    this.updatedAt = updatedAt
    if (id) this.id = id
    if (parent) this.parent = parent
  }

  async getParent() {
    if (!this.parent) return null
    const p = await db.tasks.get(this.parent)
    if (p instanceof Task) {
      return p
    } else {
      return null
    }
  }

  async save() {
    logger.debug('task save', this)
    const now = Date.now()
    if (!this.createdAt) this.createdAt = now
    this.updatedAt = now
    const taskId = await db.tasks.put(this)
    this.id = taskId
    return this
  }

  async update() {
    if (!this.id) {
      await this.save()
      return
    }
    return db.tasks.update(this.id, this)
  }

  async remove() {
    return db.transaction('rw', db.tasks, async () => {
      const id = this.id as string
      const childrenTask = await db.tasks
        .where('id')
        .anyOf(this.children)
        .toArray()
      await Promise.all(
        childrenTask.map(async (task) => {
          if (task instanceof Task) {
            await task.remove()
          }
        })
      )
      return db.tasks.delete(id)
    })
  }

  async saveChildren(task: Task | string) {
    return db.transaction('rw', db.tasks, async () => {
      const id = this.id as string
      await this.save()
      const taskId = task instanceof Task ? (task.id as string) : task

      if (task instanceof Task) {
        await task.save()
      }
      const newChildren = _uniq([...this.children, taskId])
      await db.tasks.update(id, {
        children: newChildren,
      })
      await db.tasks.update(taskId, {
        parent: id,
      })
      this.children = newChildren
    })
  }

  async removeChildren(task: Task | string) {
    return db.transaction('rw', db.tasks, async () => {
      if (!this.id) throw new Error('this task is not saved')
      let childTaskId: string
      if (task instanceof Task) {
        if (task.id === undefined) {
          throw new Error('Child task not saved')
        }
        childTaskId = task.id
        task.remove()
      } else {
        childTaskId = task
        const childTask = await db.tasks.get(task)
        if (childTask instanceof Task) {
          childTask.remove()
        }
      }
      const newChildren = this.children.filter((num) => num !== childTaskId)
      await db.tasks.update(this.id, {
        children: newChildren,
      })
      this.children = newChildren
    })
  }
}

db.tasks.mapToClass(Task)
