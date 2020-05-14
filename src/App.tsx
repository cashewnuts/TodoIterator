import React, { useContext, SyntheticEvent } from 'react'
import { useEffect, useState } from 'react'
import TodoApp from './app/TodoApp'
import TodoRecursive from './app/TodoRecursive'
import TodoQueueApp from './app/TodoQueueApp'
import './styles.css'
import { Switch, Route, Link } from 'react-router-dom'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import ExitToAppIcon from '@material-ui/icons/ExitToApp'
import FolderSpecialIcon from '@material-ui/icons/FolderSpecial'
import SyncIcon from '@material-ui/icons/Sync'
import CircularProgress from '@material-ui/core/CircularProgress'
import { createLogger } from './services/logger'
import IconButton from '@material-ui/core/IconButton'
import { makeStyles } from '@material-ui/core/styles'
import GdriveIcon from './components/icons/GdriveIcon'
import ServiceContext from './contexts/service-context'
import MenuItem from '@material-ui/core/MenuItem'
import Menu from '@material-ui/core/Menu'
import { LAST_SYNCED, RELOAD_THRESHOLD } from './constants/local-storage'
import { useHistory } from 'react-router-dom'
import { db } from './services/local-db'
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
  const history = useHistory()
  const { storeService } = useContext(ServiceContext)
  const [anchorEl, setAnchorEl] = useState<Element | null>(null)
  const [driveAuthed, setDriveAuthed] = useState(false)
  const [loading, setLoading] = useState(false)

  const isMenuOpen = Boolean(anchorEl)

  useEffect(() => {
    const initFn = async () => {
      try {
        setLoading(true)
        await storeService.ready()
        setDriveAuthed(storeService.isSignedIn)
        if (storeService.isSignedIn) {
          const lastLoadedTime = parseInt(
            localStorage.getItem(LAST_SYNCED) || '0',
            10
          )
          if (lastLoadedTime + RELOAD_THRESHOLD < Date.now()) {
            await storeService.init()
          }
        }
      } catch (err) {
        logger.error('Error while App initiating', err)
      } finally {
        setDriveAuthed(storeService.isSignedIn)
        setLoading(false)
      }
    }
    initFn()

    window.onunhandledrejection = async (event: PromiseRejectionEvent) => {
      logger.error('onunhandledrejection', event)
      storeService.reset()
      const { isHandled, reload } = await db.handleRejection(event.reason)
      if (isHandled) {
        event.preventDefault()
        event.stopPropagation()
        event.cancelBubble = true
      }
      if (reload) {
        window.location.reload()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const handleAuth = async () => {
    await storeService.login()
    const isSignedIn = storeService.isSignedIn
    setDriveAuthed(isSignedIn || false)
    await storeService.init()
  }
  const handleSync = async () => {
    try {
      setLoading(true)
      await storeService.sync()
    } catch (err) {
      logger.error('handleSync', err.message, err)
    } finally {
      setLoading(false)
    }
  }
  const handleDriveMenuOpen = (event: SyntheticEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleDriveMenuClose = () => {
    setAnchorEl(null)
  }
  const handleDriveLogout = async () => {
    try {
      setLoading(true)
      handleDriveMenuClose()
      await storeService.logout()
      setDriveAuthed(false)
      history.push('/')
      window.location.reload(false)
    } catch (err) {
      logger.error('logout', err.message, err)
    } finally {
      setLoading(false)
    }
  }
  const renderDriveMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      id="drive-menu"
      keepMounted
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={isMenuOpen}
      onClose={handleDriveMenuClose}
    >
      <MenuItem onClick={handleDriveLogout}>
        <ExitToAppIcon />
        Logout
      </MenuItem>
    </Menu>
  )
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
                {!loading && (
                  <IconButton color="inherit" onClick={handleSync}>
                    <SyncIcon />
                  </IconButton>
                )}
                <IconButton color="inherit" onClick={handleDriveMenuOpen}>
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
      {renderDriveMenu}
      <Switch>
        <Route path="/nest/:todoId">
          <TodoRecursive />
        </Route>
        <Route path="/queue">
          <TodoQueueApp />
        </Route>
        <Route path="/">
          <TodoApp />
        </Route>
      </Switch>
    </div>
  )
}
