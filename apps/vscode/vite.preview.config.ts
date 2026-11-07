import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const appRoot = fileURLToPath( new URL( '.', import.meta.url ) );

// The slide preview's page, built apart from the block editor's so neither
// loads the other's stylesheet.
export default defineConfig( {
	root: resolve( appRoot, 'src/preview' ),
	base: './',
	build: {
		outDir: resolve( appRoot, 'dist/preview' ),
		emptyOutDir: true,
		cssCodeSplit: false,
		rollupOptions: {
			input: resolve( appRoot, 'src/preview/main.ts' ),
			output: {
				entryFileNames: 'main.js',
				chunkFileNames: 'chunks/[name]-[hash].js',
				assetFileNames: 'assets/[name][extname]',
			},
		},
	},
} );
