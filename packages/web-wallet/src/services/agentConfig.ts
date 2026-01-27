/**
 * Agent Configuration Service
 *
 * Fetches and caches agent configuration from the backend.
 * This provides the single source of truth for the agent's public URL
 * and feature flags, eliminating the need for duplicate configuration
 * in the frontend.
 */

export interface AgentConfig {
  publicBaseUrl: string
  paths: {
    vcApi: string
    didApi: string
    oid4vci: string
    oid4vp: string
    assets: string
  }
  features: {
    inbox: boolean
    oid4vci: boolean
    oid4vp: boolean
    vcApi: boolean
  }
}

class AgentConfigManager {
  private config: AgentConfig | null = null
  private loadPromise: Promise<AgentConfig> | null = null

  /**
   * Load agent configuration from the backend.
   * Results are cached for subsequent calls.
   */
  async load(): Promise<AgentConfig> {
    if (this.config) return this.config
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = this.fetchConfig()
    this.config = await this.loadPromise
    return this.config
  }

  private async fetchConfig(): Promise<AgentConfig> {
    // Bootstrap URL is needed to contact the agent initially
    const bootstrapUrl = process.env.BROWSER_PUBLIC_AGENT_BASE_URL ?? 'http://localhost:5010'
    try {
      const res = await fetch(`${bootstrapUrl}/api/config`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const config = await res.json()
      console.log('[AgentConfig] Loaded config from agent:', config.publicBaseUrl)
      return config
    } catch (error) {
      console.warn('[AgentConfig] Failed to fetch config from agent, using defaults:', error)
      return {
        publicBaseUrl: bootstrapUrl,
        paths: {
          vcApi: '/vc',
          didApi: '/did',
          oid4vci: '/oid4vci',
          oid4vp: '/oid4vp',
          assets: '/api/assets',
        },
        features: {
          inbox: true,
          oid4vci: true,
          oid4vp: true,
          vcApi: true,
        },
      }
    }
  }

  /**
   * Get the public base URL for the agent.
   * Falls back to env var if config not yet loaded.
   */
  getPublicBaseUrl(): string {
    return this.config?.publicBaseUrl ?? process.env.BROWSER_PUBLIC_AGENT_BASE_URL ?? 'http://localhost:5010'
  }

  /**
   * Get the full configuration object.
   * Returns null if not yet loaded.
   */
  getConfig(): AgentConfig | null {
    return this.config
  }

  /**
   * Check if a feature is enabled.
   * Defaults to true if config not loaded.
   */
  isFeatureEnabled(feature: keyof AgentConfig['features']): boolean {
    return this.config?.features[feature] ?? true
  }

  /**
   * Get an API path.
   * Falls back to defaults if config not loaded.
   */
  getPath(path: keyof AgentConfig['paths']): string {
    const defaults: AgentConfig['paths'] = {
      vcApi: '/vc',
      didApi: '/did',
      oid4vci: '/oid4vci',
      oid4vp: '/oid4vp',
      assets: '/api/assets',
    }
    return this.config?.paths[path] ?? defaults[path]
  }
}

export const agentConfig = new AgentConfigManager()
