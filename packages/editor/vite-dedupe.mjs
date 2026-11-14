/**
 * Packages each app's Vite config resolves from the app root.
 *
 * pnpm installs several physical copies of the same `@wordpress/*` version,
 * one per peer-dependency resolution. They share a single `@wordpress/data`
 * registry, so loading two copies of a store package registers its store
 * twice (`Store "core/preferences" is already registered.`). Resolving them
 * from the app root collapses each package to a single instance.
 *
 * Plain JavaScript because Node loads this file directly when it reads a Vite
 * config.
 */
export const dedupe = [
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
