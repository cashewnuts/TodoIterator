import * as React from 'react'
import { useEffect } from 'react'
import TodoApp from './app/TodoApp'
import TodoRecursive from './app/TodoRecursive'
import './styles.css'
import { Switch, Route, Link } from 'react-router-dom'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import { createLogger } from './services/logger'
import { loadScript } from './services/network-service'
const logger = createLogger({ filename: 'App.tsx' })

export default function App() {
  useEffect(() => {
    const start = async () => {
      logger.info('gapi loaded', gapi)
    }
    const load3dPartyScript = async () => {
      await loadScript('https://apis.google.com/js/api.js')
      gapi.load('client', start)
    }
    load3dPartyScript()
  }, [])
  return (
    <div className="App">
      <AppBar position="static">
        <Toolbar>
          <Link to="/">
            <Typography variant="h6">Todo Iterator</Typography>
          </Link>
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
