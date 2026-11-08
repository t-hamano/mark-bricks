/**
 * Publishes a directory to the gh-pages branch, which GitHub Pages serves.
 *
 * The site and every PR's Storybook preview share the branch, so each publish
 * only replaces its own part:
 *
 *   node publish-gh-pages.mjs --target .                --source apps/site/dist
 *   node publish-gh-pages.mjs --target pr-preview/pr-12 --source storybook/storybook-static
 *   node publish-gh-pages.mjs --target pr-preview/pr-12 --remove
 *
 * The branch always holds a single commit, so old previews do not pile up in
 * the repository history. Concurrent publishes are retried on top of the
 * latest branch state.
 *
 * Requires GITHUB_TOKEN (with contents: write) and GITHUB_REPOSITORY.
 */
import { execFileSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	mkdtempSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const BRANCH = 'gh-pages';
const PREVIEW_DIR = 'pr-preview';
const MAX_ATTEMPTS = 5;

const { values } = parseArgs( {
	options: {
		target: { type: 'string' },
		source: { type: 'string' },
		remove: { type: 'boolean', default: false },
	},
} );

const target = values.target;
const isRoot = target === '.';
if (
	! target ||
	( ! isRoot && ! new RegExp( `^${ PREVIEW_DIR }/pr-\\d+$` ).test( target ) )
) {
	throw new Error(
		`--target must be "." or "${ PREVIEW_DIR }/pr-<number>", got "${ target }".`
	);
}
if ( values.remove === Boolean( values.source ) ) {
	throw new Error( 'Pass either --source <dir> or --remove.' );
}
if ( values.remove && isRoot ) {
	throw new Error( 'The site root cannot be removed.' );
}

const source = values.source && resolve( values.source );
if ( source && ! existsSync( join( source, 'index.html' ) ) ) {
	throw new Error( `${ source } has no index.html. Build it first.` );
}

const { GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
if ( ! GITHUB_TOKEN || ! GITHUB_REPOSITORY ) {
	throw new Error( 'GITHUB_TOKEN and GITHUB_REPOSITORY must be set.' );
}

const workdir = mkdtempSync( join( tmpdir(), 'gh-pages-' ) );
const git = ( ...args ) =>
	execFileSync( 'git', args, { cwd: workdir, encoding: 'utf8' } ).trim();

git( 'init', '--quiet' );
git(
	'remote',
	'add',
	'origin',
	`https://x-access-token:${ GITHUB_TOKEN }@github.com/${ GITHUB_REPOSITORY }.git`
);
git( 'config', 'user.name', 'github-actions[bot]' );
git(
	'config',
	'user.email',
	'41898282+github-actions[bot]@users.noreply.github.com'
);

/**
 * Fetches the branch into the working tree and returns its commit, or an
 * empty string when the branch does not exist yet.
 */
function checkoutLatest() {
	const remote = git( 'ls-remote', 'origin', `refs/heads/${ BRANCH }` );
	const sha = remote.split( /\s/ )[ 0 ] ?? '';

	// Start from an empty tree either way.
	for ( const entry of readdirSync( workdir ) ) {
		if ( entry !== '.git' ) {
			rmSync( join( workdir, entry ), { recursive: true, force: true } );
		}
	}
	git( 'read-tree', '--empty' );

	if ( sha ) {
		git( 'fetch', '--quiet', '--depth=1', 'origin', sha );
		git( 'checkout', '--quiet', '--force', sha, '--', '.' );
	}
	return sha;
}

function applyChange() {
	if ( isRoot ) {
		// Replace the site, but keep every PR preview.
		for ( const entry of readdirSync( workdir ) ) {
			if ( entry !== '.git' && entry !== PREVIEW_DIR ) {
				rmSync( join( workdir, entry ), {
					recursive: true,
					force: true,
				} );
			}
		}
		cpSync( source, workdir, { recursive: true } );
	} else {
		const dest = join( workdir, target );
		rmSync( dest, { recursive: true, force: true } );
		if ( source ) {
			cpSync( source, dest, { recursive: true } );
		}
	}
	// Serve files and folders starting with an underscore as they are.
	writeFileSync( join( workdir, '.nojekyll' ), '' );
}

const message = values.remove
	? `Remove ${ target }`
	: `Publish ${ target } from ${ process.env.GITHUB_SHA ?? 'local build' }`;

for ( let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++ ) {
	const parent = checkoutLatest();
	applyChange();
	git( 'add', '--all' );

	const tree = git( 'write-tree' );
	if ( parent && tree === git( 'rev-parse', `${ parent }^{tree}` ) ) {
		console.log( `${ target } is already up to date.` );
		process.exit( 0 );
	}

	const commit = git( 'commit-tree', tree, '-m', message );
	try {
		// Only succeed if nobody published in the meantime.
		git(
			'push',
			'--quiet',
			`--force-with-lease=refs/heads/${ BRANCH }:${ parent }`,
			'origin',
			`${ commit }:refs/heads/${ BRANCH }`
		);
		console.log( `${ message }: done.` );
		process.exit( 0 );
	} catch ( error ) {
		if ( attempt === MAX_ATTEMPTS ) {
			throw error;
		}
		const delay = 2 ** attempt * 1000;
		console.log( `Push rejected, retrying in ${ delay / 1000 }s.` );
		await new Promise( ( done ) => setTimeout( done, delay ) );
	}
}
