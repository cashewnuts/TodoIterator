import Dexie from 'dexie'
import Task, { TASK_ROOT_ID, ITask } from '../models/task'

export class TodoIteratorDatabase extends Dexie {
  tasks: Dexie.Table<ITask | Task, string>

  constructor() {
    super('TodoIterator')

    //
    // Define tables and indexes
    // (Here's where the implicit table props are dynamically created)
    //
    this.version(1).stores({
      tasks: `id, name, *children, parent, nodeType, updatedAt`,
    })

    // The following lines are needed for it to work across typescipt using babel-preset-typescript:
    this.tasks = this.table('tasks')

    this.onPopulate()
    this.setupHooks()

    this.tasks.mapToClass(Task)
  }

  onPopulate() {
    this.on('populate', () => {
      this.tasks.add({
        id: TASK_ROOT_ID,
        name: 'root',
        description: 'root task',
        children: [],
        isDone: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    })
  }

  setupHooks() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.tasks.hook('creating', function (primKey, obj, trans) {
      const isLeaf = !Array.isArray(obj.children) || obj.children.length === 0
      obj.nodeType = isLeaf ? 'leaf' : 'branch'
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.tasks.hook('updating', function (mods, primKey, obj, trans) {
      if (mods.hasOwnProperty('children')) {
        const children = (mods as { children: unknown[] }).children
        const isLeaf = !Array.isArray(children) || children.length === 0
        return {
          nodeType: isLeaf ? 'leaf' : 'branch',
        }
      }
    })
  }
}

export const db = new TodoIteratorDatabase()
