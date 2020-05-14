import React, { createContext, PropsWithChildren, useState } from 'react'
import { EventEmitter } from 'events'
import * as EventNames from '../constants/store-event'
import { createLogger } from '../services/logger'
const logger = createLogger({ filename: 'event-context.tsx' })

export interface EventContextType {
  storeEvent: EventEmitter
}

const EventContext = createContext({} as EventContextType)

export interface EventContextProviderProps {
  render: (e: EventContextType) => void
}

export const EventContextProvider = (
  props: PropsWithChildren<EventContextProviderProps>
) => {
  const [eventContext] = useState({
    storeEvent: new EventEmitter(),
  })
  // Setup event debugging listener
  Object.keys(EventNames).forEach((key: string) => {
    const eventConst = (EventNames as { [key: string]: unknown })[key]
    if (typeof eventConst !== 'string') return
    eventContext.storeEvent.on(
      eventConst,
      logger.debug.bind(logger, eventConst)
    )
  })
  return (
    <EventContext.Provider value={eventContext}>
      {props.render(eventContext)}
      {props.children}
    </EventContext.Provider>
  )
}

export const EventContextConsumer = EventContext.Consumer

export default EventContext
