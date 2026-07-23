/**
 * Protocol versions — schemas evolve independently.
 */

export interface ProtocolVersions {
  apiVersion: string
  eventVersion: string
  schemaVersion: string
  platformVersion: string
}

export interface VersionedResponse<T> {
  data: T
  protocol: ProtocolVersions
}
