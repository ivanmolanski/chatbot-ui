/**
 * Platform capabilities — what the backend supports right now.
 */

export interface CapabilitiesResponse {
  executionTypes: string[]
  artifactTypes: string[]
  agents: string[]
  features: {
    streaming: boolean
    fileUpload: boolean
    conversations: boolean
    cancellations: boolean
    durableJobs: boolean
    reconnection: boolean
    [key: string]: boolean
  }
  protocol: {
    apiVersion: string
    eventVersion: string
    schemaVersion: string
    platformVersion: string
  }
}
