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
import SyncIcon from '@material-ui/icons/Sync'
import CircularProgress from '@material-ui/core/CircularProgress'
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
  const { storeService } = useContext(ServiceContext)
  const [driveAuthed, setDriveAuthed] = useState(false)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const initFn = async () => {
      try {
        setLoading(true)
        await storeService.init()
        setDriveAuthed(storeService.isSignedIn)
      } catch (err) {
        logger.error('Error while App initiating', err)
      } finally {
        setLoading(false)
      }
    }
    initFn()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const handleAuth = async () => {
    const isSignedIn = storeService.isSignedIn
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
            {loading && (
              <IconButton color="inherit" disabled disableRipple>
                <CircularProgress color="secondary" size={30} />
              </IconButton>
            )}
            {driveAuthed ? (
              <>
                <IconButton color="inherit">
                  <SyncIcon />
                </IconButton>
                <IconButton color="inherit">
                  <GdriveIcon fontSize="large" />
                </IconButton>
              </>
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
        <Route path="/nest/:todoId">
          <TodoRecursive />
        </Route>
        <Route path="/">
          <TodoApp />
        </Route>
      </Switch>
    </div>
  )
}
