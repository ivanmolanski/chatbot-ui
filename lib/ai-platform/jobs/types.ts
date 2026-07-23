/**
 * Job — A durable unit of work.
 * Survives disconnections. Can be resumed. Can be cancelled.
 */

import type { ExecutionInput, PlatformError } from "../domain/types"

export interface Job {
  id: string
  type: string
  status: JobStatus
  input: ExecutionInput
  config: Record<string, unknown>
  createdAt: string
  startedAt?: string
  completedAt?: string
  result?: unknown
  error?: PlatformError
  metadata: Record<string, unknown>
}

export type JobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "paused"

export interface JobHandle {
  jobId: string
  subscribe(): AsyncIterable<import("../events/types").ExecutionEvent>
  getStatus(): Promise<Job>
  cancel(): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
}
