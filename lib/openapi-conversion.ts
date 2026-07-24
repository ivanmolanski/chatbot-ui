/**
 * OpenAPI Conversion — Validates OpenAPI specs without heavy dependencies.
 *
 * Per ARCHITECTURE.md: This validates OpenAPI specs for tool creation.
 * The backend handles the actual parsing and execution.
 * Includes a bounded local $ref dereferencer.
 */

interface OpenAPIData {
  info: {
    title: string
    description: string
    server: string
  }
  routes: {
    path: string
    method: string
    operationId: string
    requestInBody?: boolean
  }[]
  functions: any
}

/**
 * Bounded local $ref dereferencer for OpenAPI specs.
 * Resolves JSON References ($ref) within the spec document boundaries.
 * Throws on circular references or unresolvable paths.
 */
function dereferenceRefs(node: any, root: any, visited: Set<string>): any {
  if (!node || typeof node !== "object") return node

  if (node.$ref) {
    const refPath = node.$ref as string
    if (!refPath.startsWith("#/")) {
      throw new Error(`Cannot resolve external $ref: ${refPath}`)
    }
    if (visited.has(refPath)) {
      throw new Error(`Circular $ref detected: ${refPath}`)
    }
    visited.add(refPath)

    const parts = refPath.slice(2).split("/")
    let resolved: any = root
    for (const part of parts) {
      const key = decodeURIComponent(
        part.replace(/~1/g, "/").replace(/~0/g, "~")
      )
      if (resolved == null || typeof resolved !== "object") {
        throw new Error(`Cannot resolve $ref: ${refPath}`)
      }
      resolved = resolved[key]
    }

    // If the resolved node itself has $ref, keep resolving
    visited.delete(refPath)
    return dereferenceRefs(resolved, root, new Set([...visited]))
  }

  if (Array.isArray(node)) {
    return node.map(item => dereferenceRefs(item, root, new Set(visited)))
  }

  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(node)) {
    result[key] = dereferenceRefs(value, root, new Set(visited))
  }
  return result
}

export const validateOpenAPI = async (openapiSpec: any) => {
  if (!openapiSpec.info) {
    throw new Error("('info'): field required")
  }

  if (!openapiSpec.info.title) {
    throw new Error("('info', 'title'): field required")
  }

  if (!openapiSpec.info.version) {
    throw new Error("('info', 'version'): field required")
  }

  if (
    !openapiSpec.servers ||
    !openapiSpec.servers.length ||
    !openapiSpec.servers[0].url
  ) {
    throw new Error("Could not find a valid URL in `servers`")
  }

  if (!openapiSpec.paths || Object.keys(openapiSpec.paths).length === 0) {
    throw new Error("No paths found in the OpenAPI spec")
  }

  Object.keys(openapiSpec.paths).forEach(path => {
    if (!path.startsWith("/")) {
      throw new Error(`Path ${path} does not start with a slash; skipping`)
    }
  })

  if (
    Object.values(openapiSpec.paths).some((methods: any) =>
      Object.values(methods).some((spec: any) => !spec.operationId)
    )
  ) {
    throw new Error("Some methods are missing operationId")
  }

  if (
    Object.values(openapiSpec.paths).some((methods: any) =>
      Object.values(methods).some(
        (spec: any) => spec.requestBody && !spec.requestBody.content
      )
    )
  ) {
    throw new Error(
      "Some methods with a requestBody are missing requestBody.content"
    )
  }

  if (
    Object.values(openapiSpec.paths).some((methods: any) =>
      Object.values(methods).some((spec: any) => {
        if (spec.requestBody?.content?.["application/json"]?.schema) {
          if (
            !spec.requestBody.content["application/json"].schema.properties ||
            Object.keys(spec.requestBody.content["application/json"].schema)
              .length === 0
          ) {
            throw new Error(
              `In context=('paths', '${Object.keys(methods)[0]}', '${
                Object.keys(spec)[0]
              }', 'requestBody', 'content', 'application/json', 'schema'), object schema missing properties`
            )
          }
        }
      })
    )
  ) {
    throw new Error("Some object schemas are missing properties")
  }
}

export const openapiToFunctions = async (
  openapiSpec: any
): Promise<OpenAPIData> => {
  const functions: any[] = [] // Define a proper type for function objects
  const routes: {
    path: string
    method: string
    operationId: string
    requestInBody?: boolean // Add a flag to indicate if the request should be in the body
  }[] = []

  for (const [path, methods] of Object.entries(openapiSpec.paths)) {
    if (typeof methods !== "object" || methods === null) {
      continue
    }

    for (const [method, specWithRef] of Object.entries(
      methods as Record<string, any>
    )) {
      // Resolve $ref references with a bounded local dereferencer
      const spec = dereferenceRefs(specWithRef, openapiSpec, new Set())
      const functionName = spec.operationId
      const desc = spec.description || spec.summary || ""

      const schema: { type: string; properties: any; required?: string[] } = {
        type: "object",
        properties: {}
      }

      const reqBody = spec.requestBody?.content?.["application/json"]?.schema
      if (reqBody) {
        schema.properties.requestBody = reqBody
      }

      const params = spec.parameters || []
      if (params.length > 0) {
        const paramProperties = params.reduce((acc: any, param: any) => {
          if (param.schema) {
            acc[param.name] = param.schema
          }
          return acc
        }, {})

        schema.properties.parameters = {
          type: "object",
          properties: paramProperties
        }
      }

      functions.push({
        type: "function",
        function: {
          name: functionName,
          description: desc,
          parameters: schema
        }
      })

      // Determine if the request should be in the body based on the presence of requestBody
      const requestInBody = !!spec.requestBody

      routes.push({
        path,
        method,
        operationId: functionName,
        requestInBody // Include this flag in the route information
      })
    }
  }

  return {
    info: {
      title: openapiSpec.info.title,
      description: openapiSpec.info.description,
      server: openapiSpec.servers[0].url
    },
    routes,
    functions
  }
}
