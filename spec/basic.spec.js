const { join } = require('path');
const webpack = require('webpack');
const rimraf = require('rimraf');
const { WebpackRuntimeConfig } = require('../');

jest.setTimeout(30000);

process.on('unhandledRejection', r => console.log(r));
process.traceDeprecation = true;

const OUTPUT_DIR = join(__dirname, 'fixtures/dist/');

const runWebpack = async (config = {}, entry = 'index.js') => new Promise((resolve, reject) => {
	webpack({
		mode: 'development',
		entry: './index.js',
		context: join(__dirname, 'fixtures/'),
		devtool: '',
		output: {
			path: OUTPUT_DIR,
			filename: 'main.js',
		},
		...config,
	}, (err, stats) => {
		expect(err).toBeFalsy();
		if (err) return reject(err);

		resolve(stats);
	});
});

const expectStatsErrors = (stats, shouldHave = false) => {
	const compilationErrors = (stats.compilation.errors || []).join('\n');
	if (!shouldHave) {
		expect(compilationErrors).toBe('');
	} else {
		expect(compilationErrors).not.toBe('');
	}
};

const expectStatsWarnings = (stats, shouldHave = false) => {
	const compilationWarnings = (stats.compilation.warnings || []).join('\n');
	if (!shouldHave) {
		expect(compilationWarnings).toBe('');
	} else {
		expect(compilationWarnings).not.toBe('');
	}
};

const expectStatsGreen = (stats) => {
	expectStatsErrors(stats);
	expectStatsWarnings(stats);
};

describe('WebpackRuntimeConfig', () => {
	beforeEach(done => {
		rimraf(OUTPUT_DIR, done);
	});

	it('should build', async () => {
		const stats = await runWebpack({
			plugins: [new WebpackRuntimeConfig({
				envs: [{ name: 'dev', config: { somethingValue: 'fooBar', shouldTreeShake: 'tree-shaken-value' } }],
				request: 'gdu/config',
			})],
		});

		expectStatsGreen(stats);
	});

	it.only('should build with async', async () => {
		const stats = await runWebpack({
			entry: './complex.js',
			plugins: [new WebpackRuntimeConfig({
				envs: [{ name: 'dev', config: { somethingValue: 'fooBar', shouldTreeShake: 'tree-shaken-value' } }],
				request: 'gdu/config',
			})],
		});

		expectStatsGreen(stats);
	});

	it.skip('should fail when passing "default" as config key', async () => {
		const stats = await runWebpack({
			plugins: [new WebpackRuntimeConfig({
				envs: [{ name: 'dev', config: { somethingValue: 'fooBar', shouldTreeShake: 'tree-shaken-value' } }],
				request: 'gdu/config',
			})],
		});
		console.log(stats.toString());

		expectStatsErrors(stats, true);
		expectStatsWarnings(stats, true);
	});

	it.skip('should match snapshot', async () => {
		const stats = await runWebpack({
			plugins: [new WebpackRuntimeConfig({
				envs: [{ name: 'dev', config: { somethingValue: 'fooBar', shouldTreeShake: 'tree-shaken-value' } }],
				request: 'gdu/config',
			})],
		});

		expect(stats.toJson().modules).toMatchSnapshot();
	});
});
