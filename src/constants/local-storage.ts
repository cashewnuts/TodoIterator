const envToNum = (envName: string) => {
  const val = process.env[envName]
  if (typeof val === 'undefined') {
    return undefined
  }
  const parsed = parseInt(val, 10)
  if (isNaN(parsed)) {
    throw new Error(`${envName} is not numeric value: ${val}`)
  }
  return parsed
}

export const RELOAD_THRESHOLD = envToNum('RELOAD_THRESHOLD') || 300000 // default 5mins
export const LAST_SYNCED = 'LS_last_loaded'
