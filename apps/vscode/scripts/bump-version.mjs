import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname( fileURLToPath( import.meta.url ) );
const rootDir = resolve( __dirname, '..' );

const pkg = JSON.parse(
	readFileSync( resolve( rootDir, 'package.json' ), 'utf8' )
);
const version = pkg.version;

if ( ! /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test( version ) ) {
	throw new Error( `Invalid version in package.json: ${ version }` );
}

// npm version cannot detect this monorepo's .git from a workspace subdir
// (@npmcli/git's is() doesn't walk up), so it silently skips commit/tag. We
// run them here instead. `.npmrc` sets `git-tag-version=false` to prevent
// npm from even trying.
const git = ( ...args ) =>
	execFileSync( 'git', args, { cwd: rootDir, stdio: 'inherit' } );

git( 'add', 'CHANGELOG.md', 'package.json' );
git( 'commit', '-m', `chore(release): vscode v${ version }` );
git( 'tag', `vscode-v${ version }` );
