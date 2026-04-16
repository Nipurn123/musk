import { type Config } from "./gen/types.gen.js";
export type ServerOptions = {
    hostname?: string;
    port?: number;
    signal?: AbortSignal;
    timeout?: number;
    config?: Config;
};
export type TuiOptions = {
    project?: string;
    model?: string;
    session?: string;
    agent?: string;
    signal?: AbortSignal;
    config?: Config;
};
export declare function create100XPromptServer(options?: ServerOptions): Promise<{
    url: string;
    close(): void;
}>;
export declare function create100XPromptTui(options?: TuiOptions): {
    close(): void;
};
