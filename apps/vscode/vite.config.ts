import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const appRoot = fileURLToPath( new URL( '.', import.meta.url ) );

// Collapses pnpm's several physical copies of each `@wordpress/*` package to
// one instance, since loading two copies of a store package registers its
// `@wordpress/data` store twice.
const dedupe = [
	'react',
	'react-dom',
	'@wordpress/block-editor',
	'@wordpress/block-library',
	'@wordpress/blocks',
	'@wordpress/commands',
	'@wordpress/core-data',
	'@wordpress/data',
	'@wordpress/dataviews',
	'@wordpress/element',
	'@wordpress/interface',
	'@wordpress/keyboard-shortcuts',
	'@wordpress/notices',
	'@wordpress/patterns',
	'@wordpress/preferences',
	'@wordpress/rich-text',
	'@wordpress/upload-media',
];

export default defineConfig( {
	root: resolve( appRoot, 'src/webview' ),
	base: './',
	plugins: [ react() ],
	resolve: { dedupe },
	build: {
		outDir: resolve( appRoot, 'dist/webview' ),
		emptyOutDir: true,
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
