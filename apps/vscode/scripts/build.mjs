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
	entryPoints: {
		extension: resolve( appRoot, 'src/extension/index.ts' ),
		// Marp CLI, which the extension loads on the first PDF export.
		'marp-cli': resolve( appRoot, 'src/extension/export/marp-cli.ts' ),
	},
	outdir: resolve( appRoot, 'dist' ),
	outExtension: { '.js': '.cjs' },
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'node18',
	external: [
		'vscode',
		// Marp CLI's dependencies require these only in code the export never
		// runs: `batch` falls back to `emitter` outside Node, and
		// `cosmiconfig` loads TypeScript for a `.ts` config file.
		'emitter',
		'typescript',
	],
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

for ( const configFile of [ 'vite.config.ts', 'vite.preview.config.ts' ] ) {
	await viteBuild( {
		configFile: resolve( appRoot, configFile ),
		build: {
			sourcemap: watch,
			minify: ! watch,
			watch: watch ? {} : null,
		},
	} );
}
