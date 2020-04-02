import ChunkGroup from 'webpack/lib/ChunkGroup';
import GraphHelpers from 'webpack/lib/GraphHelpers';
import webpack, { Plugin } from 'webpack';
import {
	ConfigDependency,
	ConfigDependencyFactory,
	ConfigModule,
} from './ConfigModule';
import { ConfigQueryModule } from './ConfigQueryModule';
import type { Options } from './types';
import { SyncHook } from 'tapable';
import NormalModuleFactory = webpack.compilation.NormalModuleFactory;
import Chunk = webpack.compilation.Chunk;
import Compilation = webpack.compilation.Compilation;

const hooksCache = new WeakMap<
	Compilation,
	{
		configChunk: SyncHook<ArrayType<Options['configs']>, Chunk>;
		configChunks: SyncHook<ArrayType<Options['configs']>[], Chunk[]>;
	}
>();

const PLUGIN_NAME = 'configs-webpack-plugin';

export class RuntimeConfigsPlugin implements Plugin {
	private _configs: Options['configs'];

	constructor(private options: Options) {
		this._configs = [...options.configs]; // If its a generator, collect that here
	}

	static getHooks(compilation) {
		let hooks = hooksCache.get(compilation);
		if (hooks === undefined) {
			hooks = {
				configChunk: new SyncHook(['config', 'chunk']),
				configChunks: new SyncHook(['configs', 'chunks']),
			};
			hooksCache.set(compilation, hooks);
		}
		return hooks;
	}

	apply(compiler): void {
		compiler.hooks.make.tap(PLUGIN_NAME, (compilation) => {
			const myHooks = RuntimeConfigsPlugin.getHooks(compilation);

			compilation.dependencyFactories.set(
				ConfigDependency,
				new ConfigDependencyFactory(),
			);

			// Make sure all ConfigModules are the same across chunks.
			compilation.hooks.moduleIds.tap(PLUGIN_NAME, (modules) => {
				for (const mod of modules) {
					if (mod instanceof ConfigModule) {
						// TODO: Hash the config object config graph
						mod.id = 'config_module';
					}
				}
			});

			compilation.hooks.afterChunks.tap(PLUGIN_NAME, () => {
				const configChunks = [] as [
					Chunk,
					ArrayType<Options['configs']>,
				][];

				for (const module of compilation.modules) {
					if (module instanceof ConfigModule) {
						const {
							config: { name, config },
						} = module;

						const chunkGroup = new ChunkGroup(`config-${name}`);

						const newChunk = compilation.addChunk(
							`config-${name}`,
						) as Chunk;

						newChunk.chunkReason = `config for ${name}`;
						newChunk.preventIntegration = true;

						// When the module graph was built our ConfigModules were added in place, this removes
						// them everywhere - so we can "split them out".
						for (const chunk of compilation.chunks) {
							chunk.removeModule(module);
							module.rewriteChunkInReasons(chunk, [newChunk]);
						}

						GraphHelpers.connectChunkAndModule(newChunk, module);
						GraphHelpers.connectChunkGroupAndChunk(
							chunkGroup,
							newChunk,
						);

						// So that we guarantee the jsonp stuff exists.
						compilation.entrypoints.forEach((entrypoint) => {
							GraphHelpers.connectChunkGroupParentAndChild(
								entrypoint,
								chunkGroup,
							);
						});

						myHooks.configChunk.call({ config, name }, newChunk);

						// To be used for the hooks
						configChunks.push([newChunk, { name, config }]);
					}
				}

				myHooks.configChunks.call(
					configChunks.map((i) => i[1]),
					configChunks.map((i) => i[0]),
				);
			});
		});

		compiler.hooks.thisCompilation.tap(
			PLUGIN_NAME,
			(_compilation, { normalModuleFactory }) => {
				new RuntimeConfigsFactoryPlugin({
					...this.options,
					configs: this._configs,
				}).apply(normalModuleFactory);
			},
		);
	}
}

class RuntimeConfigsFactoryPlugin {
	constructor(private options: Options) {}

	apply(normalModuleFactory: NormalModuleFactory) {
		normalModuleFactory.hooks.factory.tap(
			PLUGIN_NAME,
			(factory) => (data, callback) => {
				const context = data.context;
				const dependency = data.dependencies[0];

				if (dependency.request === this.options.request) {
					return void callback(
						null,
						new ConfigQueryModule(
							this.options,
							data.contextInfo.issuer,
							context,
						),
					);
				}

				return void factory(data, callback);
			},
		);
	}
}
