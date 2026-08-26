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
