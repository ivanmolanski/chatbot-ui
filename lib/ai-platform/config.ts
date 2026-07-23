/**
 * AI Platform Configuration
 */

export interface AIPlatformConfig {
  baseUrl: string
  apiKey?: string
  timeout: number
  retries: number
  streamTimeout: number
}

export const defaultConfig: AIPlatformConfig = {
  baseUrl: "/api/v1",
  timeout: 30000,
  retries: 3,
  streamTimeout: 300000
}

export function createConfig(
  overrides: Partial<AIPlatformConfig> = {}
): AIPlatformConfig {
  return { ...defaultConfig, ...overrides }
}
