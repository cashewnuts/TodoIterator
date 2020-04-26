import React, {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useState,
} from 'react'
import GdriveService from '../services/gdrive-service'

export interface ServiceContextType {
  gdriveService?: GdriveService
}

const ServiceContext = createContext<ServiceContextType>({})

export const ServiceContextProvider: FunctionComponent<{}> = (
  props: PropsWithChildren<{}>
) => {
  const [gdriveService] = useState(new GdriveService())

  return (
    <ServiceContext.Provider value={{ gdriveService }}>
      {props.children}
    </ServiceContext.Provider>
  )
}

export const EventContextConsumer = ServiceContext.Consumer

export default ServiceContext
