import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { build as viteBuild } from 'vite';

const appRoot = fileURLToPath( new URL( '..', import.meta.url ) );
const watch = process.argv.includes( '--watch' );

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
