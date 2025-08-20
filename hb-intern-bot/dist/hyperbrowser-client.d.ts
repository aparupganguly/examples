export interface HyperbrowserConfig {
    apiKey: string;
}
export interface ExtractOptions {
    url: string;
    data_schema?: any;
}
export interface ExtractResponse {
    data?: any;
    error?: string;
}
export default class HyperbrowserClient {
    private client;
    constructor(config: HyperbrowserConfig);
    extract(options: ExtractOptions): Promise<ExtractResponse>;
    private getSchemaAndPrompt;
}
//# sourceMappingURL=hyperbrowser-client.d.ts.map