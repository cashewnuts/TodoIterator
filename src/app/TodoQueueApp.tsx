import React, { PropsWithChildren, useEffect, useState } from 'react'
import { db } from '../services/local-db'
import { createLogger } from '../services/logger'
import { ITask } from '../models/task'
const logger = createLogger({ filename: 'TodoQueueApp.tsx' })

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TodoQueueApp = (props: PropsWithChildren<unknown>) => {
  const [taskQueue, setTaskQueue] = useState<ITask[]>([])
  useEffect(() => {
    const asyncFn = async () => {
      const leafTasks = await db.tasks.where({ nodeType: 'leaf' }).toArray()
      setTaskQueue(leafTasks)
      logger.debug('leafTasks', leafTasks)
    }
    asyncFn()
  })
  return (
    <>
      <h1>hello</h1>
      <ul>
        {taskQueue &&
          taskQueue.map((task) => <li key={task.id}>{task.name}</li>)}
      </ul>
    </>
  )
}

export default TodoQueueApp
