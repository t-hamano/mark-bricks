import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const appRoot = fileURLToPath( new URL( '.', import.meta.url ) );

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

const TEXT_EDITOR_MODULE =
	'packages/editor/src/components/text-editor/index.tsx';

/**
 * Redirects the editor's Monaco-based source editor to a stub.
 *
 * The module is only reached through a dynamic `import()`, which Rollup cannot
 * drop even when `enableCodeEditor` is `false`: lazy loading moves Monaco out
 * of the entry chunk, but its ~4 MB of chunks are still emitted and would ship
 * inside the `.vsix`. Swapping the module out at resolve time removes it.
 *
 * A path alias cannot do this. Aliases match the raw specifier, and the import
 * is written relative (`../text-editor`), so the redirect has to happen after
 * the specifier is resolved to a file.
 *
 * @return The Vite plugin.
 */
function stubTextEditor(): Plugin {
	const stub = resolve( appRoot, 'src/webview/text-editor-stub.tsx' );
	return {
		name: 'mark-bricks:stub-text-editor',
		enforce: 'pre',
		async resolveId( source, importer, options ) {
			const resolved = await this.resolve( source, importer, options );
			if ( ! resolved || resolved.id === stub ) {
				return null;
			}
			const path = resolved.id.split( '?' )[ 0 ].replace( /\\/g, '/' );
			return path.endsWith( TEXT_EDITOR_MODULE ) ? stub : null;
		},
	};
}

export default defineConfig( {
	root: resolve( appRoot, 'src/webview' ),
	// Assets are loaded from a `vscode-webview://` URI whose path is not known
	// until the extension host rewrites it, so they must be referenced
	// relative to the entry module.
	base: './',
	plugins: [ stubTextEditor(), react() ],
	resolve: { dedupe },
	build: {
		outDir: resolve( appRoot, 'dist/webview' ),
		emptyOutDir: true,
		// One stylesheet keeps the generated webview HTML to a single <link>.
		cssCodeSplit: false,
		// The extension host builds its own HTML (nonce, CSP, `asWebviewUri`),
		// so the bundle is entered from the script rather than an index.html.
		// The entry and the stylesheet are named without a hash for the host to
		// reference directly; a webview loads them from disk, so there is no
		// cache to bust. Lazily imported chunks keep theirs.
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
