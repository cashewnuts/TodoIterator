import React, { createContext, PropsWithChildren, useState } from 'react'
import GdriveProvider from '../services/providers/gdrive-provider'
import StoreService from '../services/store-service'
import { EventEmitter } from 'events'

export interface ServiceContextType {
  gdriveProvider: GdriveProvider
  storeService: StoreService
}

const ServiceContext = createContext<ServiceContextType>(
  {} as ServiceContextType
)

export interface ServiceContextProviderProps {
  storeEvent: EventEmitter
}

export const ServiceContextProvider = (
  props: PropsWithChildren<ServiceContextProviderProps>
) => {
  const [gdriveProvider] = useState(new GdriveProvider())
  const [storeService] = useState(
    new StoreService(gdriveProvider, props.storeEvent)
  )

  return (
    <ServiceContext.Provider value={{ gdriveProvider, storeService }}>
      {props.children}
    </ServiceContext.Provider>
  )
}

export const EventContextConsumer = ServiceContext.Consumer

export default ServiceContext
