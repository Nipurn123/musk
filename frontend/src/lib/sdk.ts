import { create100XPromptClient, type X100PromptClient } from "@/sdk/v2/client"
import { useAuthStore } from "../store"
import { getDefaultDirectory } from "./workspace"

const DEFAULT_DIRECTORY = getDefaultDirectory()

let clientInstance: X100PromptClient | null = null

export function getSDKClient(): X100PromptClient {
  const { apiKey, serverUrl } = useAuthStore.getState()

  if (clientInstance) {
    return clientInstance
  }

  const baseUrl = serverUrl || "/api"

  clientInstance = create100XPromptClient({
    baseUrl,
    headers: {
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    },
    directory: DEFAULT_DIRECTORY,
  })

  return clientInstance
}

export function resetSDKClient() {
  clientInstance = null
}

export { type X100PromptClient } from "@/sdk/v2/client"
