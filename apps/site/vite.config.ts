import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The release automation already maintains these links. Keep one source of
// truth, including when the desktop and VS Code release versions differ.
const readme = readFileSync(
	new URL( '../../README.md', import.meta.url ),
	'utf8'
);
const platforms = [ 'windows', 'macos', 'linux' ] as const;
const downloads = Object.fromEntries(
	platforms.map( ( platform ) => {
		const match = readme.match(
			new RegExp(
				`<!-- download:${ platform } -->\\[.*?\\]\\((https://github\\.com/t-hamano/mark-bricks/releases/download/[^)]+)\\)<!-- /download:${ platform } -->`
			)
		);
		if ( ! match ) {
			throw new Error(
				`Missing desktop download link for ${ platform } in README.md`
			);
		}
		return [ platform, match[ 1 ] ];
	} )
);

export default defineConfig( {
	// Relative paths support both the default /mark-bricks/ Pages path and
	// local previews, without coupling the app to a repository name.
	base: './',
	plugins: [
		react(),
		{
			name: 'desktop-download-links',
			transformIndexHtml: ( html ) =>
				platforms.reduce(
					( result, platform ) =>
						result
							.split( `__DOWNLOAD_${ platform.toUpperCase() }__` )
							.join( downloads[ platform ] ),
					html
				),
		},
	],
	resolve: {
		// Gutenberg stores must share a registry across pnpm peer resolutions.
		dedupe: [
			'react',
			'react-dom',
			'monaco-editor',
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
		],
	},
	build: {
		cssTarget: [ 'chrome123', 'edge123', 'firefox120', 'safari17.5' ],
		rolldownOptions: { input: [ 'index.html', 'demo.html' ] },
	},
} );
