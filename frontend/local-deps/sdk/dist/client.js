export * from "./gen/types.gen.js";
import { createClient } from "./gen/client/client.gen.js";
import { X100PromptClient as _X100PromptClient } from "./gen/sdk.gen.js";
export { _X100PromptClient as X100PromptClient };
export function create100XPromptClient(config) {
    if (!config?.fetch) {
        const customFetch = (req) => {
            // @ts-ignore
            req.timeout = false;
            return fetch(req);
        };
        config = {
            ...config,
            fetch: customFetch,
        };
    }
    if (config?.directory) {
        config.headers = {
            ...config.headers,
            "x-100xprompt-directory": config.directory,
        };
    }
    const client = createClient(config);
    return new _X100PromptClient({ client });
}
