export * from "./gen/types.gen.js";
import { type Config } from "./gen/client/types.gen.js";
import { X100PromptClient as _X100PromptClient } from "./gen/sdk.gen.js";
export { type Config as X100PromptClientConfig, _X100PromptClient as X100PromptClient };
export declare function create100XPromptClient(config?: Config & {
    directory?: string;
}): _X100PromptClient;
