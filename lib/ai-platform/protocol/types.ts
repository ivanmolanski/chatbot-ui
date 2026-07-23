/**
 * Protocol versions — schemas evolve independently.
 *
 * Transport.request<T>() must expose negotiated protocol versions.
 * The canonical representation is response headers; there is no
 * VersionedResponse<T> wrapper — callers inspect the headers.
 */

export interface ProtocolVersions {
  apiVersion: string
  eventVersion: string
  schemaVersion: string
  platformVersion: string
}
