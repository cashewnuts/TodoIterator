import React, { useContext } from 'react'
import { useEffect, useState } from 'react'
import TodoApp from './app/TodoApp'
import TodoRecursive from './app/TodoRecursive'
import './styles.css'
import { Switch, Route, Link } from 'react-router-dom'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import FolderSpecialIcon from '@material-ui/icons/FolderSpecial'
import { createLogger } from './services/logger'
import IconButton from '@material-ui/core/IconButton'
import { makeStyles } from '@material-ui/core/styles'
import GdriveIcon from './components/icons/GdriveIcon'
import ServiceContext from './contexts/service-context'
import { db } from './services/local-db'
import Task, { ITask } from './models/task'
const logger = createLogger({ filename: 'App.tsx' })

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useStyles = makeStyles((_theme) => ({
  grow: {
    flexGrow: 1,
  },
  app: {
    fontFamily: 'sans-serif',
    textAlign: 'center',
  },
  taskBar: {
    display: 'flex',
    flexWrap: 'nowrap',
  },
}))

export default function App() {
  const classes = useStyles()
  const { gdriveService } = useContext(ServiceContext)
  const [driveAuthed, setDriveAuthed] = useState(false)
  useEffect(() => {
    const initFn = async () => {
      try {
        await gdriveService?.load()
        setDriveAuthed(gdriveService?.isSignedIn || false)
        if (!gdriveService) return
        const { result, status } = await gdriveService.list()
        logger.info('listData', status, result)
        const { files } = result
        const tasks = await db.tasks.toArray()
        const todoMeta = files?.find((f) => f.name === 'todo-list')
        if (todoMeta) {
          const { result } = await gdriveService.get({
            fileId: todoMeta.id as string,
          })
          if (result instanceof Array) {
            logger.debug('result instanceof Array')
            const modifiedTasks = await Promise.all(
              result.map(async (task: ITask) => {
                if (!task.id && !task.name) return
                const localTask = await db.tasks.get(task.id || '')
                if (localTask instanceof Task) {
                  if ((localTask.updatedAt || 0) < (task.updatedAt || 0)) {
                    logger.info('put', task, localTask.id)
                    return new Task(task)
                  }
                } else {
                  return new Task(task)
                }
              })
            )
            await Promise.all(
              modifiedTasks
                .filter((x): x is Task => x !== undefined)
                .map(async (task: Task) => {
                  const tParent = await task.getParent()
                  if (tParent) {
                    await tParent.saveChildren(task)
                  } else {
                    await task.save()
                  }
                })
            )

            logger.info('get', result)
          }
        }
        const createResponse = await gdriveService.create({
          id: todoMeta?.id,
          name: 'todo-list',
          content: JSON.stringify(tasks),
        })
        logger.info('create', createResponse)
      } catch (err) {
        logger.error('Error on drive.files.list', err)
      }
    }
    initFn()
  }, [])
  const handleAuth = async () => {
    const isSignedIn = await gdriveService?.signIn()
    setDriveAuthed(isSignedIn || false)
  }
  return (
    <div className={classes.app}>
      <AppBar position="static">
        <Toolbar>
          <Link to="/">
            <Typography variant="h6">Todo Iterator</Typography>
          </Link>
          <div className={classes.grow} />
          <div className={classes.taskBar}>
            {driveAuthed ? (
              <GdriveIcon fontSize="large" />
            ) : (
              <IconButton
                aria-label="Auth with gdrive"
                color="inherit"
                onClick={handleAuth}
              >
                <FolderSpecialIcon />
              </IconButton>
            )}
          </div>
        </Toolbar>
      </AppBar>
      <Switch>
        <Route path="/:todoId">
          <TodoRecursive />
        </Route>
        <Route path="/">
          <TodoApp />
        </Route>
      </Switch>
    </div>
  )
}
