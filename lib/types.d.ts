export interface Options {
	configs: ReadonlyArray<{ name: string; config: object }>;
	request: string;
	runtimePublicPath?: string;
}
