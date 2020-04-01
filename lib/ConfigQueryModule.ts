import { Options } from './types';
import { ConfigDependency } from './ConfigModule';
import { ConcatSource, ReplaceSource } from 'webpack-sources';
import HarmonyExportImportedSpecifierDependency from 'webpack/lib/dependencies/HarmonyExportImportedSpecifierDependency';
import HarmonyCompatibilityDependency from 'webpack/lib/dependencies/HarmonyCompatibilityDependency';
import Module from 'webpack/lib/Module';

export class ConfigQueryModule extends Module {
	constructor(private options: Options, issuer: any, context: string) {
		super('javascript/dynamic', context);
		this.issuer = issuer;
		this.dependencies = [];
	}

	identifier() {
		return `config query ${JSON.stringify(
			this.options.configs.map((i) => i.name),
		)}`;
	}

	readableIdentifier() {
		return `config query`;
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

		for (const config of this.options.configs) {
			const dep = new ConfigDependency(config, this.options);
			dep.loc = {
				name: config.name,
			};

			this.dependencies.push(dep);
		}

		this.dependencies.push(new HarmonyCompatibilityDependency(this));

		callback();
	}

	source(dependencyTemplates, runtimeTemplate) {
		const importVar = '__CONFIG__';

		const reExportSpec = dependencyTemplates.get(
			HarmonyExportImportedSpecifierDependency,
		);
		// Pick the first one, as they _should_ all point to the same module id
		// @ts-ignore
		const [{ module }, ...otherDeps] = this.dependencies;

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

		const fileSource = new ConcatSource(
			runtimeTemplate.importStatement({
				update: false,
				module,
				request: module.id,
				importVar,
				originModule: this,
			}),
			dynamicReExport,
		);
		const source = new ReplaceSource(fileSource);

		for (const dep of otherDeps) {
			if (dep instanceof ConfigDependency) continue;

			const template = dependencyTemplates.get(dep.constructor);
			template.apply(dep, source, runtimeTemplate, dependencyTemplates);
		}

		return source.source();
	}

	needRebuild() {
		return !this.buildMeta;
	}

	size() {
		return 42;
	}
}
