import Module from 'webpack/lib/Module';
import Dependency from 'webpack/lib/Dependency';
import HarmonyExportSpecifierDependency from 'webpack/lib/dependencies/HarmonyExportSpecifierDependency';
import HarmonyCompatibilityDependency from 'webpack/lib/dependencies/HarmonyCompatibilityDependency';
import { ConcatSource, ReplaceSource } from 'webpack-sources';
import { Options } from './types';

type Config = ArrayType<Options['configs']>;

export class ConfigDependencyFactory {
	create({ dependencies: [dependency] }, callback) {
		callback(null, new ConfigModule(dependency.config, dependency.options));
	}
}

export class ConfigDependency extends Dependency {
	constructor(public config: Config, public options: Options) {
		super();
	}

	getResourceIdentifier() {
		return `config for ${this.config.name}`;
	}
}

export class ConfigModule extends Module {
	constructor(public config: Config, private options: Options) {
		super('javascript/dynamic');
	}

	identifier(): string {
		return `config ${this.config.name} ${JSON.stringify(
			this.config.config,
		)}`;
	}

	readableIdentifier() {
		return `config for ${this.config.name}`;
	}

	build(_options, _compilation, _resolver, _fs, callback) {
		this.built = true;
		this.buildMeta = {
			exportsType: 'named',
			providedExports: [],
		};
		this.buildInfo = {
			strict: true,
			cacheable: true,
			exportsArgument: 'exports',
		};

		this.dependencies = [new HarmonyCompatibilityDependency(this)];

		for (const [name] of Object.entries(this.config.config)) {
			if (
				this._hasPublicRuntimeConfig &&
				name === this.options.runtimePublicPath
			)
				continue;
			this.addDependency(
				new HarmonyExportSpecifierDependency(this, name, name),
			);
			this.buildMeta.providedExports!.push(name);
		}

		callback();
	}

	get _hasPublicRuntimeConfig() {
		return (
			typeof this.options.runtimePublicPath === 'string' &&
			this.config.config.hasOwnProperty(this.options.runtimePublicPath)
		);
	}

	source(dependencyTemplates, runtimeTemplate) {
		const fileSource = new ConcatSource(
			`/* Config for ${this.config.name} */\n`,
			'\n',
		);

		const source = new ReplaceSource(fileSource);

		const exportSpec = dependencyTemplates.get(
			HarmonyExportSpecifierDependency,
		);

		for (const dep of this.dependencies) {
			if (dep instanceof HarmonyExportSpecifierDependency) {
				exportSpec.harmonyInit(dep, source, runtimeTemplate);
				continue;
			}

			const template = dependencyTemplates.get(dep.constructor);
			template.apply(dep, source, runtimeTemplate, dependencyTemplates);
		}

		for (const [name, value] of Object.entries(this.config.config)) {
			fileSource.add(
				`const ${name} = ${JSON.stringify(value, null, 4)};\n`,
			);
		}

		// TODO: Move this to a entryModule instead.
		if (this._hasPublicRuntimeConfig) {
			fileSource.add(
				`\n\n__webpack_require__.p = ${this.options.runtimePublicPath} + __webpack_require__.p;`,
			);
		}

		return source.source();
	}

	needRebuild() {
		return false;
	}

	size() {
		return 42;
	}
}
