import pino from 'pino'

export interface LoggerMeta {
  filename: string
}

export const logger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
})

export const createLogger = (meta: LoggerMeta) => {
  return logger.child(meta)
}
