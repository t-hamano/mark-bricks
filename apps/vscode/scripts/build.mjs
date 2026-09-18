// Builds the extension host (Node, CommonJS, via esbuild) and the webview
// (browser, ESM, via Vite, needed for the editor's `?raw`/`.scss` imports).
// Pass `--watch` to rebuild both on change.

import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { build as viteBuild } from 'vite';

const appRoot = fileURLToPath( new URL( '..', import.meta.url ) );
const watch = process.argv.includes( '--watch' );

// Vite empties `dist/webview` on its own; this clears the extension bundle's
// leftovers from an earlier watch build.
if ( ! watch ) {
	await rm( resolve( appRoot, 'dist' ), { recursive: true, force: true } );
}

const context = await esbuild.context( {
	entryPoints: [ resolve( appRoot, 'src/extension/index.ts' ) ],
	outfile: resolve( appRoot, 'dist/extension.cjs' ),
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'node18',
	external: [ 'vscode' ], // Injected by the host at runtime.
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
