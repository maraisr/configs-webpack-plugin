declare module 'webpack/lib/Module' {
	import webpack from 'webpack';
	import Compilation = webpack.compilation.Compilation;

	export default abstract class Module {

		abstract identifier(): string;

		abstract readableIdentifier(requestShortener: string): string;

		abstract build(options, compilation: Compilation, resolver, fs, callback: (error?: any) => void);

		abstract source(dependencyTemplates, runtimeTemplate): any;

		abstract size(): number;

		abstract needRebuild?(): boolean;

		built: boolean;
		buildMeta: Partial<{
			exportsType: string;
			providedExports: string[]
		}>;
		buildInfo: Partial<{
			strict: boolean;
			cacheable: boolean;
			exportsArgument: string;
		}>;

		protected constructor(type: string, context: string | null);
	}
}
