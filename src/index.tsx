import * as React from 'react'
import { render } from 'react-dom'
import { BrowserRouter as Router } from 'react-router-dom'
import { EventContextProvider } from './contexts/event-context'
import { ServiceContextProvider } from './contexts/service-context'

import App from './App'

const rootElement = document.getElementById('root')
render(
  <Router>
    <EventContextProvider
      render={(eventContext) => (
        <ServiceContextProvider storeEvent={eventContext.storeEvent}>
          <App />
        </ServiceContextProvider>
      )}
    ></EventContextProvider>
  </Router>,
  rootElement
)
