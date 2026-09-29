/**
 * External dependencies
 */
import { existsSync } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base } from '@playwright/test';

const STATIC_DIR = join(
	dirname( fileURLToPath( import.meta.url ) ),
	'..',
	'storybook-static'
);
const ORIGIN = 'http://storybook.test';

/**
 * Serves the static Storybook build to the page from disk, so the tests need
 * no web server.
 */
export const test = base.extend( {
	context: async ( { context }, provide ) => {
		if ( ! existsSync( STATIC_DIR ) ) {
			throw new Error(
				'storybook-static is missing. Run `pnpm build-storybook` first.'
			);
		}
		await context.route( `${ ORIGIN }/**`, ( route ) => {
			const { pathname } = new URL( route.request().url() );
			const path = normalize(
				join( STATIC_DIR, decodeURIComponent( pathname ) )
			);
			if ( ! path.startsWith( STATIC_DIR + sep ) || ! extname( path ) ) {
				return route.fulfill( { status: 404 } );
			}
			return existsSync( path )
				? route.fulfill( { path } )
				: route.fulfill( { status: 404 } );
		} );
		await provide( context );
	},
} );

/**
 * Returns the URL that renders a single story without the Storybook UI.
 *
 * @param id The story ID, such as `codepreview--math-formula`.
 * @return The URL of the story.
 */
export function storyUrl( id: string ) {
	return `${ ORIGIN }/iframe.html?id=${ id }&viewMode=story`;
}

export { expect } from '@playwright/test';
