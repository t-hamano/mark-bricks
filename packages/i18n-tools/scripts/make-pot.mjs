import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire( import.meta.url );

// Resolve @wp-blocks/make-pot's CLI entry from this package, so the dependency
// is owned here regardless of workspace hoisting.
function resolveMakePotBin() {
	const pkgPath = require.resolve( '@wp-blocks/make-pot/package.json' );
	const { bin } = require( pkgPath );
	const rel =
		typeof bin === 'string' ? bin : ( bin[ 'make-pot' ] ?? bin.default );
	return path.join( path.dirname( pkgPath ), rel );
}

/**
 * Drops the entries make-pot adds from `package.json` (name, description and
 * author), which it always reads as a WordPress theme or plugin header and
 * places under a made-up `style.css` reference. The apps never show them, so
 * they would only sit untranslated in every locale. make-pot has no option to
 * turn this off.
 *
 * Works on the POT text, so the rest of make-pot's output stays as it wrote it.
 *
 * @param {string} pot POT file contents.
 * @return {string} POT file contents without the header entries.
 */
export function removePackageHeaderEntries( pot ) {
	const isHeaderReference = ( line ) =>
		/^#: style\.css(?::\d+)?$/.test( line.trim() );
	const trailing = pot.match( /\n*$/ )[ 0 ];
	const entries = pot
		.slice( 0, pot.length - trailing.length )
		.split( /\n{2,}/ )
		.flatMap( ( block ) => {
			const lines = block.split( '\n' );
			const references = lines.filter( ( line ) =>
				line.startsWith( '#:' )
			);
			if (
				references.length > 0 &&
				references.every( isHeaderReference )
			) {
				return [];
			}
			return [
				lines
					.filter( ( line ) => ! isHeaderReference( line ) )
					.join( '\n' ),
			];
		} )
		.join( '\n\n' );
	return entries + trailing;
}

/**
 * Extract translatable strings into `languages/<slug>.pot` by running the
 * make-pot CLI (from `@wp-blocks/make-pot`). Wraps the binary so consumers
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
				resolve( stripPackageHeaders( root, slug ) );
			} else {
				reject( new Error( `make-pot exited with code ${ code }` ) );
			}
		} );
	} );
}

async function stripPackageHeaders( root, slug ) {
	const potPath = path.join( root, 'languages', `${ slug }.pot` );
	const pot = await readFile( potPath, 'utf8' );
	await writeFile( potPath, removePackageHeaderEntries( pot ) );
}
