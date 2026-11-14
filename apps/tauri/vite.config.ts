import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dedupe } from '@mark-bricks/editor/vite-dedupe';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig( async () => ( {
	plugins: [ react() ],
	clearScreen: false,
	resolve: {
		dedupe,
		alias: {
			// The block editor's client-side image processing, which the app
			// never turns on. See `src/stubs/vips-worker.ts`.
			'@wordpress/vips/worker': fileURLToPath(
				new URL( './src/stubs/vips-worker.ts', import.meta.url )
			),
		},
	},
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
