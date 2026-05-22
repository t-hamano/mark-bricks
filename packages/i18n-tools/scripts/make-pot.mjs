import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire( import.meta.url );

// Resolve @wp-blocks/make-pot's CLI entry from this package, so the dependency
// is owned here regardless of workspace hoisting.
function resolveMakePotBin() {
	const pkgPath = require.resolve( '@wp-blocks/make-pot/package.json' );
	const { bin } = require( pkgPath );
	const rel =
		typeof bin === 'string' ? bin : bin[ 'make-pot' ] ?? bin.default;
	return path.join( path.dirname( pkgPath ), rel );
}

/**
 * Extract translatable strings into `languages/<slug>.pot` by running the
 * make-pot CLI (from @wp-blocks/make-pot). Wraps the binary so consumers
 * depend only on `@mark-bricks/i18n-tools`.
 *
 * @param {Object} options
 * @param {string} options.root Package root that owns the `languages/` dir.
 * @param {string} options.slug Text domain / file slug (e.g. `mark-bricks`).
 */
export function makePot( { root, slug } ) {
	const args = [
		resolveMakePotBin(),
		'.',
		'languages',
		`--slug=${ slug }`,
		'--include',
		'src/**',
		'--charset=utf-8',
		'--skip-audit',
		'--headers',
		'email:-',
	];

	return new Promise( ( resolve, reject ) => {
		const child = spawn( process.execPath, args, {
			cwd: root,
			stdio: 'inherit',
		} );
		child.on( 'error', reject );
		child.on( 'close', ( code ) => {
			if ( code === 0 ) {
				resolve();
			} else {
				reject( new Error( `make-pot exited with code ${ code }` ) );
			}
		} );
	} );
}
