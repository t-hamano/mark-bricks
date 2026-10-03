import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const host = process.env.TAURI_DEV_HOST;

// pnpm installs several physical copies of the same `@wordpress/*` version, one
// per peer-dependency resolution. They share a single `@wordpress/data`
// registry, so loading two copies of a store package registers its store twice
// (`Store "core/preferences" is already registered.`). Resolving them from the
// app root collapses each package to a single instance.
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

export default defineConfig( async () => ( {
	plugins: [ react() ],
	clearScreen: false,
	resolve: { dedupe },
	build: {
		// Keeps `light-dark()` intact, since its fallback ignores the runtime
		// `color-scheme` set by the theme provider.
		cssTarget: [ 'chrome123', 'safari17.5' ],
		// Keeps every font a file: the CSP's `font-src 'self'` refuses the
		// `data:` URI a small one would otherwise be inlined as.
		assetsInlineLimit: ( file: string ) =>
			/\.(?:woff2?|ttf)$/.test( file ) ? false : undefined,
		rolldownOptions: {
			// The slide preview window and the hidden window that prints a deck
			// to PDF load pages of their own.
			input: [ 'index.html', 'pages/preview.html', 'pages/export.html' ],
		},
	},
	server: {
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: 'ws',
					host,
					port: 1421,
				}
			: undefined,
		watch: {
			ignored: [ '**/src-tauri/**' ],
		},
	},
} ) );
