// Builds the two bundles the extension ships: the extension host (Node,
// CommonJS, via esbuild) and the webview (browser, ESM, via Vite — the editor
// package uses Vite-only imports such as `?raw`, `?inline` and `.scss`).
//
// Pass `--watch` to rebuild both on change.

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { build as viteBuild } from 'vite';

const appRoot = fileURLToPath( new URL( '..', import.meta.url ) );
const watch = process.argv.includes( '--watch' );

const context = await esbuild.context( {
	entryPoints: [ resolve( appRoot, 'src/extension/index.ts' ) ],
	outfile: resolve( appRoot, 'dist/extension.cjs' ),
	bundle: true,
	platform: 'node',
	format: 'cjs',
	// The oldest Node runtime among the VSCode versions in `engines`.
	target: 'node18',
	// Injected by the extension host at runtime; bundling it would break it.
	external: [ 'vscode' ],
	sourcemap: watch,
	minify: ! watch,
	logLevel: 'info',
} );

if ( watch ) {
	await context.watch();
} else {
	await context.rebuild();
	await context.dispose();
}

await viteBuild( {
	configFile: resolve( appRoot, 'vite.config.ts' ),
	build: {
		sourcemap: watch,
		minify: ! watch,
		watch: watch ? {} : null,
	},
} );
