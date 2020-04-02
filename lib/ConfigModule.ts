import Module from 'webpack/lib/Module';
import Dependency from 'webpack/lib/Dependency';
import HarmonyExportSpecifierDependency from 'webpack/lib/dependencies/HarmonyExportSpecifierDependency';
import HarmonyCompatibilityDependency from 'webpack/lib/dependencies/HarmonyCompatibilityDependency';
import { ConcatSource, ReplaceSource } from 'webpack-sources';
import type { Options } from './types';

type Config = ArrayType<Options['configs']>;

export class ConfigDependencyFactory {
	create({ dependencies: [dependency] }, callback) {
		callback(null, new ConfigModule(dependency.config));
	}
}

export class ConfigDependency extends Dependency {
	constructor(public config: Config) {
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
			providedExports: [],
		};
		this.buildInfo = {
			strict: true,
			cacheable: true,
			exportsArgument: 'exports',
		};

		this.dependencies = [new HarmonyCompatibilityDependency(this)];

		for (const [name] of Object.entries(this.config.config)) {
			this.addDependency(
				new HarmonyExportSpecifierDependency(this, name, name),
			);
			this.buildMeta.providedExports!.push(name);
		}

		callback();
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

		return source.source();
	}

	needRebuild() {
		return false;
	}

	size() {
		return 42;
	}
}
