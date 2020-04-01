declare module 'webpack/lib/Module' {
	import webpack from 'webpack';
	import Compilation = webpack.compilation.Compilation;
	import Dependency = webpack.compilation.Dependency;

	export default abstract class Module extends webpack.compilation.Module {

		public dependencies: Dependency[];

		addDependency(dependency: Dependency): void;

		abstract build(options, compilation: Compilation, resolver, fs, callback: (error?: any) => void);

		abstract source(dependencyTemplates, runtimeTemplate): any;

		abstract size(): number;

		abstract identifier(): string;

		abstract readableIdentifier(requestShortener: string): string;

		buildMeta: Partial<{
			exportsType: string;
			providedExports: string[]
		}>;
		buildInfo: Partial<{
			strict: boolean;
			cacheable: boolean;
			exportsArgument: string;
		}>;
	}
}

declare module 'webpack/lib/Dependency' {
	import webpack from 'webpack';

	export default class Dependency extends webpack.compilation.Dependency {
		public loc: object;
	}
}


declare module 'webpack/lib/dependencies/HarmonyExportSpecifierDependency' {
	import Module from 'webpack/lib/Module';
	import Dependency from 'webpack/lib/Dependency';

	export default class HarmonyExportSpecifierDependency extends Dependency {
		name: string;

		constructor(originModule: Module, id: string | number, name: string)
	}
}
