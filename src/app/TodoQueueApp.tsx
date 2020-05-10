import React, { PropsWithChildren, useEffect } from 'react'
import { db } from '../services/local-db'
import { createLogger } from '../services/logger'
const logger = createLogger({ filename: 'TodoQueueApp.tsx' })

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TodoQueueApp = (props: PropsWithChildren<unknown>) => {
  useEffect(() => {
    const asyncFn = async () => {
      const leafTasks = await db.tasks.where({ nodeType: 'leaf' }).toArray()
      logger.debug('leafTasks', leafTasks)
    }
    asyncFn()
  })
  return (
    <>
      <h1>hello</h1>
    </>
  )
}

export default TodoQueueApp
