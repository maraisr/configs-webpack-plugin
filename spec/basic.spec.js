const rimraf = require('rimraf');
const { expectStatsGreen, runWebpack } = require('./helpers');
const { join } = require('path');
const { RuntimeConfigsPlugin } = require('../dist');

const basicConfig = {
	somethingValue: 'fooBar',
	shouldTreeShake: 'tree-shaken-value',
	nested: {
		test: 'nested',
	},
};

const OUTPUT_DIR = join(__dirname, 'fixtures/basic-dist/');

describe('ConfigsWebpackPlugin :: RuntimeConfigsPlugin :: basic', () => {
	beforeEach(done => {
		rimraf(OUTPUT_DIR, done);
	});

	it('should build with async', async () => {
		const stats = await runWebpack({
			plugins: [new RuntimeConfigsPlugin({
				configs: [
					{ name: 'dev', config: basicConfig },
					{ name: 'uat', config: { ...basicConfig, somethingElseHappened: 'in uat' } },
				],
				request: 'gdu/config',
			})],
		}, OUTPUT_DIR);

		expectStatsGreen(stats);
	});

	it('should fire hook for configChunks', async () => {
		// one for the webpack errors, and one for the hook.
		expect.assertions(2);
		const hookSpy = jest.fn();

		await runWebpack({
			plugins: [
				new class TesterPlugin {
					apply(compiler) {
						compiler.hooks.compilation.tap('testing', compilation => {
							RuntimeConfigsPlugin.getHooks(compilation)
								.configChunk.tap('tester', hookSpy);
						});
					}
				},
				new RuntimeConfigsPlugin({
					configs: [
						{ name: 'dev', config: basicConfig },
						{ name: 'uat', config: { ...basicConfig, somethingElseHappened: 'in uat' } },
					],
					request: 'gdu/config',
				}),
			],
		}, OUTPUT_DIR);

		expect(hookSpy).toHaveBeenCalledTimes(2);
	});

	it.each([
		'./index.js',
		'./defered.js',
	])('should match snapshot for %s', async (entry) => {
		const stats = await runWebpack({
			entry,
			plugins: [
				new class TestingPlugin {
					apply(compiler) {
						compiler.hooks.afterCompile.tap('testing', compilation => {
							Object.entries(compilation.assets)
								.forEach(([name, asset]) => {
									expect(asset.source())
										.toMatchSnapshot(name);
								});
						});
					}
				},
				new RuntimeConfigsPlugin({
					configs: [
						{ name: 'dev', config: basicConfig },
						{ name: 'uat', config: { ...basicConfig, somethingElse: 'in uat' } },
					],
					request: 'gdu/config',
				}),
			],
		}, OUTPUT_DIR);

		expectStatsGreen(stats);
	});

	it('should match snapshot', async () => {
		await runWebpack({
			plugins: [
				new class TestingPlugin {
					apply(compiler) {
						let chunks;

						compiler.hooks.compilation.tap('testing', compilation => {
							RuntimeConfigsPlugin.getHooks(compilation)
								.configChunks
								.tap('testing', (_,configChunks) => {
									chunks = configChunks;
								});
						});

						compiler.hooks.afterCompile.tap('testing', compilation => {
							const chunkFiles = chunks.map(item => item.files).flat();

							for (const configChunkFileName of chunkFiles) {
								expect(compilation.assets[configChunkFileName]).toBeTruthy();

								expect(compilation.assets[configChunkFileName].source())
									.toMatchSnapshot(configChunkFileName);
							}
						});
					}
				},
				new RuntimeConfigsPlugin({
					configs: [
						{ name: 'dev', config: basicConfig },
						{ name: 'uat', config: { ...basicConfig, somethingElse: 'in uat' } },
					],
					request: 'gdu/config',
				}),
			],
		}, OUTPUT_DIR);
	});

	it('should work in production mode also', async () => {
		const stats = await runWebpack({
			mode: 'production',
			optimization: {
				concatenateModules: true,
			},
			plugins: [new RuntimeConfigsPlugin({
				configs: [
					{ name: 'dev', config: basicConfig },
				],
				request: 'gdu/config',
			})],
		}, OUTPUT_DIR);

		expectStatsGreen(stats);
	});
});
