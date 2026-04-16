export * from "./gen/types.gen.js";
import { createClient } from "./gen/client/client.gen.js";
import { X100PromptClient as _X100PromptClient } from "./gen/sdk.gen.js";
export { _X100PromptClient as X100PromptClient };
export function create100XPromptClient(config) {
    const originalFetch = config?.fetch ?? globalThis.fetch;
    const customFetch = async (input, init) => {
        // HeyAPI passes a Request object or URL + options
        // The signal might be on the Request object or in the init options
        let signal;
        if (input instanceof Request) {
            signal = input.signal;
            // @ts-ignore - Bun specific timeout extension
            input.timeout = false;
        }
        if (init?.signal) {
            signal = init.signal;
        }
        const response = await originalFetch(input, init);
        const wrapParser = (parser, parseType) => {
            return async () => {
                try {
                    return await parser();
                }
                catch (e) {
                    if (e instanceof Error &&
                        (e.message.includes("Unexpected end of JSON input") ||
                            e.message.includes("terminated") ||
                            e.message.includes("JSON"))) {
                        // Case 1: Request was intentionally aborted — surface a clean AbortError
                        if (signal?.aborted) {
                            const abortError = new Error("The operation was aborted");
                            abortError.name = "AbortError";
                            throw abortError;
                        }
                        // Case 2: Server returned empty/truncated body on a success response
                        // Return safe defaults instead of crashing
                        if (response.ok) {
                            console.warn(`[100xprompt] Empty or malformed response body (status ${response.status}, url: ${response.url}). ` +
                                `Returning empty ${parseType === "text" ? "string" : "object"}.`);
                            return parseType === "text" ? "" : {};
                        }
                        // Case 3: Error response with unparseable body — wrap with context
                        const wrappedError = new Error(`Failed to parse ${parseType ?? "response"} from ${response.url} (status ${response.status}): ${e.message}`);
                        wrappedError.name = "ResponseParseError";
                        throw wrappedError;
                    }
                    throw e;
                }
            };
        };
        // Proxy the response to wrap json() and text()
        return new Proxy(response, {
            get(target, prop) {
                const value = target[prop];
                if (typeof value === "function") {
                    if (prop === "json" || prop === "text") {
                        return wrapParser(value.bind(target), prop);
                    }
                    return value.bind(target);
                }
                return value;
            },
        });
    };
    config = {
        ...config,
        fetch: customFetch,
    };
    if (config?.directory) {
        const isNonASCII = /[^\x00-\x7F]/.test(config.directory);
        const encodedDirectory = isNonASCII ? encodeURIComponent(config.directory) : config.directory;
        config.headers = {
            ...config.headers,
            "x-100xprompt-directory": encodedDirectory,
        };
    }
    const client = createClient(config);
    return new _X100PromptClient({ client });
}
