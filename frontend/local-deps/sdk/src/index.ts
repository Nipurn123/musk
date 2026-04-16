export * from "./client.js"
export * from "./server.js"

import { create100XPromptClient } from "./client.js"
import { create100XPromptServer } from "./server.js"
import type { ServerOptions } from "./server.js"

export async function create100XPrompt(options?: ServerOptions) {
  const server = await create100XPromptServer({
    ...options,
  })

  const client = create100XPromptClient({
    baseUrl: server.url,
  })

  return {
    client,
    server,
  }
}
