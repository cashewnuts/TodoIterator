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
        if (!files || files.length !== 0) {
          return
        }
        const createResponse = await gdriveService.create({
          name: 'todo-list',
          content: 'hello world!',
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
