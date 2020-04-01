import Module from 'webpack/lib/Module';
import Dependency from 'webpack/lib/Dependency';
import HarmonyExportSpecifierDependency from 'webpack/lib/dependencies/HarmonyExportSpecifierDependency';
import { ConcatSource, ReplaceSource } from 'webpack-sources';
import { Options } from './types';

type Config = ArrayType<Options['configs']>;

export class ConfigDependencyFactory {
	create({ dependencies: [dependency] }, callback) {
		callback(null, new ConfigModule(dependency.config));
	}
}

export class ConfigDependency extends Dependency {
	constructor(private config: Config) {
		super();
	}

	getResourceIdentifier() {
		return `config for ${this.config.name}`;
	}
}

export class ConfigModule extends Module {
	constructor(public config: Config) {
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
			providedExports: Object.keys(this.config.config),
		};
		this.buildInfo = {
			strict: true,
			cacheable: true,
			exportsArgument: 'exports',
		};

		this.dependencies = [];

		for (const [name] of Object.entries(this.config.config)) {
			this.addDependency(
				new HarmonyExportSpecifierDependency(this, name, name),
			);
		}

		callback();
	}

	source(dependencyTemplates, runtimeTemplate) {
		const fileSource = new ConcatSource(
			`/* Config for ${this.config.name} */\n`,
			'\n',
		);

		const source = new ReplaceSource(fileSource);
		source.insert(
			-10,
			runtimeTemplate.defineEsModuleFlagStatement(this.buildInfo),
		);

		const exportSpec = dependencyTemplates.get(
			HarmonyExportSpecifierDependency,
		);

		for (const dep of this.dependencies) {
			if (dep instanceof HarmonyExportSpecifierDependency) {
				exportSpec.harmonyInit(dep, source, runtimeTemplate);
				fileSource.add(
					// @ts-ignore
					`const ${dep.name} = ${JSON.stringify(
						this.config.config[dep.name],
						null,
						4,
					)};\n`,
				);
			}
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
