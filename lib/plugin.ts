import webpack, { Plugin } from 'webpack';
import HarmonyExportSpecifierDependency from 'webpack/lib/dependencies/HarmonyExportSpecifierDependency';
import { ConcatSource } from 'webpack-sources';
import Module from 'webpack/lib/Module';
import NormalModuleFactory = webpack.compilation.NormalModuleFactory;

interface Config {
	envs: { name: string; config: object }[];
	request: string;
}

const envCache = new WeakMap<any, Config['envs']>();

export default class WebpackRuntimeConfig implements Plugin {
	static PLUGIN_NAME = WebpackRuntimeConfig.name;

	constructor(private config: Config) {}

	apply(compiler): void {
		compiler.hooks.compile.tap(
			WebpackRuntimeConfig.PLUGIN_NAME,
			({ normalModuleFactory }) => {
				new WebpackRuntimeConfigFactoryPlugin(this.config).apply(
					normalModuleFactory,
				);
			},
		);
		// TODO: Somewhere here, grab a child compiler, and compile to source all env's, mark as chunks all with the same id.
	}
}

class WebpackRuntimeConfigFactoryPlugin {
	static PLUGIN_NAME = WebpackRuntimeConfig.name;

	constructor(private config: Config) {}

	apply(normalModuleFactory: NormalModuleFactory) {
		normalModuleFactory.hooks.factory.tap(
			WebpackRuntimeConfigFactoryPlugin.PLUGIN_NAME,
			(factory) => (data, callback) => {
				const context = data.context;
				const dependency = data.dependencies[0];

				if (dependency.request === this.config.request) {
					return void callback(
						null,
						new ConfigModule(this.config.envs, context),
					);
				}

				return void factory(data, callback);
			},
		);
	}
}

class ConfigModule extends Module {
	constructor(private envs: Config['envs'], context: string) {
		super('javascript/esm', context);
	}

	identifier() {
		return `config ${JSON.stringify(this.envs.map((i) => i.name))}`;
	}

	readableIdentifier() {
		return `config wrapper`;
	}

	source(dependencyTemplates, runtimeTemplate) {
		const importSpec = dependencyTemplates.get(
			HarmonyExportSpecifierDependency,
		);

		return new ConcatSource('test');
	}

	build(options, compilation, resolver, fs, callback) {
		this.built = true;
		this.buildMeta = {
			exportsType: 'namespace',
		};
		this.buildInfo = {
			strict: true,
			cacheable: true,
			exportsArgument: '__webpack_exports__',
		};

		let envConfig: Config['envs'];
		if (envCache.has(compilation)) {
			envConfig = envCache.get(compilation)!;
		} else {
			const cfgs = [...this.envs];
			envCache.set(compilation, cfgs);
			envConfig = cfgs;
		}

		// Collect config keys
		const configKeys = Array.from(getExportsFromEnv(envConfig).keys());

		if (configKeys.includes('default')) {
			return void callback(
				new Error('Sorry "default" is a reserved config key.'),
			);
		}

		this.buildMeta['providedExports'] = ['default', ...configKeys];

		callback();
	}

	needRebuild(): boolean {
		return false;
	}

	size() {
		return 42;
	}
}

const exportCache = new WeakMap();

const getExportsFromEnv = (envs: Config['envs']): Map<string, any> => {
	if (exportCache.has(envs)) return exportCache.get(envs);

	const m = new Map();

	envs.reduce(
		(result, item) => [...result, ...Object.keys(item.config)],
		[] as string[],
	).forEach((key) => {
		m.set(key, envs[key]);
	});

	exportCache.set(envs, m);

	return m;
};
