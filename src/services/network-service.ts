const scriptLoadingPromises = Object.create(null)

export const loadScript = (url: string) => {
  if (!scriptLoadingPromises[url]) {
    scriptLoadingPromises[url] = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.onload = resolve
      script.onerror = () => {
        scriptLoadingPromises[url] = null
        reject()
      }
      script.src = url
      document.head.appendChild(script)
    })
  }
  return scriptLoadingPromises[url]
}
