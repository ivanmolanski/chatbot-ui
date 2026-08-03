/**
 * Model Fetcher — Per architecture, models are served by the control plane.
 */

import { LLM, LLMID } from "@/types"

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
