const rimraf = require('rimraf');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { join } = require('path');
const { runWebpack, expectStatsGreen } = require('./helpers');
const { WebpackRuntimeConfig } = require('../');

const OUTPUT_DIR = join(__dirname, 'fixtures/html-dist/');

const basicConfig = {
	somethingValue: 'fooBar',
	shouldTreeShake: 'tree-shaken-value',
	nested: {
		test: 'nested',
	},
};

describe.only('WebpackRuntimeConfig :: basic', () => {
	beforeEach(done => {
		rimraf(OUTPUT_DIR, done);
	});

	it('should build', async () => {
		const stats = await runWebpack({
			entry: './defered.js',
			plugins: [
				new HtmlWebpackPlugin(),
				new class HtmlWebpackPluginConfigAdditions {
					apply(compiler) {
						compiler.hooks.make.tap('testing', compilation => {
							let chunks;

							WebpackRuntimeConfig
								.getHooks(compilation)
								.configChunks
								.tap('testing', configChunks => {
									chunks = configChunks;
								});

							HtmlWebpackPlugin.getHooks(compilation)
								.alterAssetTags
								.tap('testing', ({ assetTags: tags }) => {
									const [configChunk] = chunks;
									tags.scripts.unshift({
										tagName: 'script',
										voidTag: false,
										attributes: { src: `${compilation.options.output.publicPath || ''}${configChunk.files[0]}` },
									});
								});
						});
					}
				},
				new WebpackRuntimeConfig({
					runtimePublicPath: 'publicPath',
					configs: [
						{ name: 'dev', config: { ...basicConfig, publicPath: '../' } },
						{ name: 'uat', config: { ...basicConfig, somethingElseHappened: 'in uat' } },
					],
					request: 'gdu/config',
				}),
			],
		}, OUTPUT_DIR);

		expectStatsGreen(stats);
	});
});
