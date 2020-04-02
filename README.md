<div align="center">
    <h1>Configs Webpack Plugin</h1>
    <p>A simplified AoT runtime config solution for your webpack builds</p>
</div>

## :gear: Install

```bash
    yarn add --dev configs-webpack-plugin
```

## :point_up: What?

This is a [webpack] plugin that helps simplify the management and orchestration
of multi-environment or multi-target webpack bundles, where you want one bundle
to travel between environments. That treeshakes your config to only what is
being consumed.

A use case could be where you have a traditional staging and production
environment. Where you might to send api traffic to a different server in
staging than in production, but instead of sending in a target name, and
`if else`'ing that domain.

You can with this plugin; simply: `import { apiDomain } from '@my-org/config`,
and have that made avaliable to the bundle at runtime irrespective of config
being ran.

Few benefits:

-   Source Maps work, as this is a proper import, and no code-rewriting happens.
-   Deterministic config, webpack will throw an exception of a consumer is
    importing or using a config variable that isnt given in the first place.

## :bulb: How?

I do this by collecting all `request`'s that you're wanting to be a config. So
from the above example; `@my-org/config` is trapped by [webpack] and converted
into what I call a `Config Query` module.

This `Config Query` module, can either be concatenated by a single consumer of
config, or referenced by all your modules.

This `Config Query` module then requires a chunked of module called a `Config`
module, that actually houses the config. The trick here is that this isnt a
traditional async chunk, as it needs to exist AoT! So include the chunk before
the `bootstrap` chunk.

## :rocket: Want to use me?

```js
// webpack.config.js

const { RuntimeConfigsPlugin } = require('configs-webpack-plugin');

module.exports = {
	plugins: [
		new RuntimeConfigsPlugin({
			request: '@my-org/config',
			configs: [
				{
					name: 'staging',
					config: { apiDomain: 'https://staging-server.com' },
				},
				{
					name: 'production',
					config: { apiDomain: 'https://production-server.com' },
				},
			],
		}),
	],
};
```

> Will note that it is important that you're using `[name]` or something in the
> `chunkFilename` output option, as each config chunk _will_ have the same
> internal id.

There are also hooks, so you can couple it with [html-webpack-plugin] to inject
config chunks.
[Example](https://github.com/maraisr/configs-webpack-plugin/blob/master/spec/with-html-webpack.spec.js#L29-L49)

-   `configChunk`: `SyncHook<Options['configs'], Chunk>` calls for every config
    chunk that will emit.
-   `configChunks`: `SyncHook<Options['configs'][], Chunk[]>` calls once all
    config chunks have been created; coupled with the array of configs. Matching
    index with the chunk to config.

> These get called during the `afterChunks` hook; so be sure to tap in the
> `make` hook or alike. If you need `files` tap in one of the `emit` type hooks,
> and then get the `files` property from the chunk.

```js
RuntimeConfigsPlugin.getHooks(compilation).configChunks.tap(
	My_PLUGIN,
	(configs, chunks) => {
		// Assuming you're using the example plugin config from above.
		expect(chunks).toHaveLength(2);
	},
);
```

[webpack]: https://webpack.js.org/
[html-webpack-plugin]: https://github.com/jantimon/html-webpack-plugin
