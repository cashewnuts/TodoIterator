import pino from 'pino'

export interface LoggerMeta {
  filename: string    
}

export const logger = pino()
export const createLogger = (meta: LoggerMeta) => {
  return logger.child(meta)
}
