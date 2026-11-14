import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { dedupe } from '@mark-bricks/editor/vite-dedupe';

const appRoot = fileURLToPath( new URL( '.', import.meta.url ) );

export default defineConfig( {
	root: resolve( appRoot, 'src/webview' ),
	base: './',
	plugins: [ react() ],
	resolve: {
		dedupe,
		alias: {
			// The block editor's client-side image processing, which the
			// extension never turns on. See `stubs/vips-worker.ts`.
			'@wordpress/vips/worker': resolve(
				appRoot,
				'src/webview/stubs/vips-worker.ts'
			),
		},
	},
	build: {
		outDir: resolve( appRoot, 'dist/webview' ),
		emptyOutDir: true,
		// Keeps `light-dark()` intact, since its fallback ignores the runtime
		// `color-scheme` set by the theme provider.
		cssTarget: 'chrome123',
		cssCodeSplit: false,
		rollupOptions: {
			input: resolve( appRoot, 'src/webview/main.tsx' ),
			output: {
				entryFileNames: 'main.js',
				chunkFileNames: 'chunks/[name]-[hash].js',
				assetFileNames: 'assets/[name][extname]',
			},
		},
	},
} );
