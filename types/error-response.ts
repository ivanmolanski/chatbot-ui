import { z } from "zod"

export type ErrorResponse = {
  error: {
    code: number
    message: string
  }
}

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z
      .union([
        z.number(),
        z.string().regex(/^\d+$/, "Must be a numeric string")
      ])
      .transform(val => (typeof val === "string" ? Number(val) : val))
      .default(500),
    message: z.string().default("Internal Server Error")
  })
})
