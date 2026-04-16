export * from "./gen/types.gen.js"

import { createClient } from "./gen/client/client.gen.js"
import { type Config } from "./gen/client/types.gen.js"
import { X100PromptClient as _X100PromptClient } from "./gen/sdk.gen.js"
export { type Config as X100PromptClientConfig, _X100PromptClient as X100PromptClient }

export function create100XPromptClient(config?: Config & { directory?: string }) {
  if (!config?.fetch) {
    const customFetch: any = (req: any) => {
      // @ts-ignore
      req.timeout = false
      return fetch(req)
    }
    config = {
      ...config,
      fetch: customFetch,
    }
  }

  if (config?.directory) {
    config.headers = {
      ...config.headers,
      "x-100xprompt-directory": config.directory,
    }
  }

  const client = createClient(config)
  return new _X100PromptClient({ client })
}
