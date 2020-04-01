const { join } = require('path');
const webpack = require('webpack');

const runWebpack = async (config, outputDir) => new Promise((resolve, reject) => {
	webpack({
		mode: 'development',
		entry: './index.js',
		context: join(__dirname, 'fixtures/'),
		devtool: '',
		output: {
			path: outputDir,
			publicPath: '/',
			chunkFilename: '[name].js',
			filename: 'main.js',
		},
		...(config || {}),
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

module.exports = {
	runWebpack,
	expectStatsErrors,
	expectStatsWarnings,
	expectStatsGreen,
};
