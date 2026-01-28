type BrowserEnv = {
  [key: string]: string
}

class EnvManager {
  private env: BrowserEnv = {}
  private loaded = false
  private loadingEnvPromise: Promise<void> | null = null

  async load(): Promise<void> {
    if (this.loadingEnvPromise) {
      return this.loadingEnvPromise
    }

    if (this.loaded) {
      return
    }

    this.loadingEnvPromise = (async (): Promise<void> => {
      try {
        const res = await fetch('/api/env')

        if (!res.ok) {
          return Promise.reject(Error(`Failed to load environment: ${res.status}`))
        }

        this.env = await res.json()
        this.loaded = true
        console.log('[EnvManager] Loaded env, BROWSER_PUBLIC_AGENT_BASE_URL =', this.env['BROWSER_PUBLIC_AGENT_BASE_URL'])
      } catch (error) {
        console.error('Failed to load environment variables:', error)
        throw error
      } finally {
        this.loadingEnvPromise = null
      }
    })()

    return this.loadingEnvPromise
  }

  get(key: string): string | undefined {
    const value = this.env[key] ?? process.env[key]
    if (!this.loaded) {
      console.warn(
        `Attempting to access env var "${key}" before environment is loaded. (value is "${value}")` +
          'Make sure to call envManager.load() in _app.tsx\n' +
          'Stack trace:',
        new Error().stack,
      )
    }
    return value
  }

  getAll(): Readonly<BrowserEnv> {
    return {...this.env}
  }

  isLoaded(): boolean {
    return this.loaded
  }
}

export const envManager = new EnvManager()

export const getEnv = (key: string): string | undefined => envManager.get(key)

export const getEnvInt = (key: string, defaultValue: number): number => {
  const value = envManager.get(key)
  if (!value) {
    return defaultValue
  }
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}
