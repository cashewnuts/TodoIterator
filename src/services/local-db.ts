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
      tasks: `id, name, *children, isDone, updatedAt`,
    })

    // The following lines are needed for it to work across typescipt using babel-preset-typescript:
    this.tasks = this.table('tasks')

    this.onPopulate()
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
}

export const db = new TodoIteratorDatabase()
