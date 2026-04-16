export * from "./client.js";
export * from "./server.js";
import type { ServerOptions } from "./server.js";
export declare function create100XPrompt(options?: ServerOptions): Promise<{
    client: import("./client.js").X100PromptClient;
    server: {
        url: string;
        close(): void;
    };
}>;
