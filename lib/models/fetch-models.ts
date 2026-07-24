/**
 * Model Fetcher — Per ARCHITECTURE.md Phase 12.
 * Zero Supabase types. Model list derived from capabilities negotiation.
 * Provider-specific model lists removed; models served by control plane.
 */

import { LLM, LLMID, OpenRouterLLM } from "@/types"

export const fetchHostedModels = async () => {
  try {
    // Per ARCHITECTURE.md: Capabilities determine available models
    // Control plane advertises which models are available
    const response = await fetch("/api/v1/capabilities")

    if (!response.ok) {
      throw new Error(`Server is not responding.`)
    }

    const data = await response.json()

    const modelsToAdd: LLM[] = (data.models || []).map((m: any) => ({
      modelId: m.model_id as LLMID,
      modelName: m.model_name || m.model_id,
      provider: m.provider || "openai",
      hostedId: m.hosted_id || m.model_id,
      platformLink: m.platform_link || "",
      imageInput: m.image_input || false
    }))

    return {
      envKeyMap: data.envKeyMap || {},
      hostedModels: modelsToAdd
    }
  } catch (error) {
    console.warn("Error fetching hosted models: " + error)
  }
}

export const fetchOllamaModels = async () => {
  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_OLLAMA_URL + "/api/tags"
    )

    if (!response.ok) {
      throw new Error(`Ollama server is not responding.`)
    }

    const data = await response.json()

    const localModels: LLM[] = data.models.map((model: any) => ({
      modelId: model.name as LLMID,
      modelName: model.name,
      provider: "ollama",
      hostedId: model.name,
      platformLink: "https://ollama.ai/library",
      imageInput: false
    }))

    return localModels
  } catch (error) {
    console.warn("Error fetching Ollama models: " + error)
  }
}

export const fetchOpenRouterModels = async () => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models")

    if (!response.ok) {
      throw new Error(`OpenRouter server is not responding.`)
    }

    const { data } = await response.json()

    const openRouterModels = data.map(
      (model: {
        id: string
        name: string
        context_length: number
      }): OpenRouterLLM => ({
        modelId: model.id as LLMID,
        modelName: model.id,
        provider: "openrouter",
        hostedId: model.name,
        platformLink: "https://openrouter.dev",
        imageInput: false,
        maxContext: model.context_length
      })
    )

    return openRouterModels
  } catch (error) {
    console.error("Error fetching Open Router models: " + error)
  }
}
