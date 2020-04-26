import React from 'react'
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
import { loadScript } from './services/network-service'
import IconButton from '@material-ui/core/IconButton'
import { makeStyles } from '@material-ui/core/styles'
import GdriveIcon from './components/icons/GdriveIcon'
const logger = createLogger({ filename: 'App.tsx' })

const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useStyles = makeStyles((_theme) => ({
  grow: {
    flexGrow: 1,
  },
  taskBar: {
    display: 'flex',
    flexWrap: 'nowrap',
  },
}))

export default function App() {
  const classes = useStyles()
  const [driveAuthed, setDriveAuthed] = useState(false)
  useEffect(() => {
    const start = async () => {
      logger.info('gapi loaded', gapi)
      gapi.client
        .init({
          apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
          // Your API key will be automatically added to the Discovery Document URLs.
          discoveryDocs: DISCOVERY_DOCS,
          // clientId and scope are optional if auth is not required.
          clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.appdata',
        })
        .then(function () {
          // 3. Initialize and make the API request.
          const gdriveInitialAction = async (isSignedIn: boolean) => {
            logger.info('isSignedIn', isSignedIn)
            if (!isSignedIn) return
            setDriveAuthed(isSignedIn)
            logger.info('gapi', gapi.client.drive)
            try {
              const data = await gapi.client.drive.files.list({
                spaces: 'appDataFolder',
                pageSize: 100,
              })
              logger.info(data)
            } catch (err) {
              logger.error('Error on drive.files.list', err)
            }
          }
          // Listen for sign-in state changes.
          gapi.auth2.getAuthInstance().isSignedIn.listen(gdriveInitialAction)

          gdriveInitialAction(gapi.auth2.getAuthInstance().isSignedIn.get())
          return {}
        })
        .then(
          function (response) {
            console.log(response)
          },
          function (reason) {
            logger.error('Error on gdrive init', reason)
          }
        )
    }
    const load3dPartyScript = async () => {
      await loadScript('https://apis.google.com/js/api.js')
      gapi.load('client', start)
    }
    load3dPartyScript()
  }, [])
  const handleAuth = () => {
    gapi.auth2.getAuthInstance().signIn()
  }
  return (
    <div className="App">
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
