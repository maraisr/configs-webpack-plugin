import { Options } from './types';
import { ConfigDependency } from './ConfigModule';
import { ConcatSource } from 'webpack-sources';
import HarmonyExportImportedSpecifierDependency from 'webpack/lib/dependencies/HarmonyExportImportedSpecifierDependency';
import Module from 'webpack/lib/Module';

export class ConfigQueryModule extends Module {
	constructor(
		private configs: Options['configs'],
		issuer: any,
		context: string,
	) {
		super('javascript/dynamic', context);
		this.issuer = issuer;
		this.dependencies = [];
	}

	identifier() {
		return `config wrapper ${JSON.stringify(
			this.configs.map((i) => i.name),
		)}`;
	}

	readableIdentifier() {
		return `config wrapper`;
	}

	build(_options, _compilation, _resolver, _fs, callback) {
		this.built = true;
		this.buildMeta = {};
		this.buildInfo = {
			strict: true,
			cacheable: true,
			exportsArgument: 'exports',
		};

		this.usedExports = true;

		this.dependencies = [];

		for (const config of this.configs) {
			const dep = new ConfigDependency(config);
			dep.loc = {
				name: config.name,
			};

			this.dependencies.push(dep);
		}

		callback();
	}

	source(dependencyTemplates, runtimeTemplate) {
		const importVar = '__CONFIG__';

		const reExportSpec = dependencyTemplates.get(
			HarmonyExportImportedSpecifierDependency,
		);
		// Pick the first one, as they _should_ all point to the same module id
		// @ts-ignore
		const [{ module }] = this.dependencies;

		const dynamicReExport = reExportSpec.getContent({
			originModule: this,
			_module: module,
			shorthand: false,
			call: false,
			directImport: false,
			getImportVar() {
				return importVar;
			},
			activeExports: [],
			_discoverActiveExportsFromOtherStartExports() {
				return [];
			},
			getMode(_ignoreCase) {
				return {
					type: 'dynamic-reexport',
				};
			},
		});

		return new ConcatSource(
			runtimeTemplate.defineEsModuleFlagStatement(this.buildInfo),
			runtimeTemplate.importStatement({
				update: false,
				module,
				request: module.id,
				importVar,
				originModule: this,
			}),
			dynamicReExport,
		);
	}

	needRebuild() {
		return !this.buildMeta;
	}

	size() {
		return 42;
	}
}
