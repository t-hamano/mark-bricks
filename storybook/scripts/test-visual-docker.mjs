/**
 * Builds Storybook with the visual regression tests' stories, runs the tests
 * in the Playwright Docker image, where the CI takes its screenshots, and
 * copies the screenshots back. Arguments are passed to `playwright test`, for
 * example `--update-snapshots`.
 *
 * Storybook is built on the host, and only the build and the tests go into
 * the container: the host's node_modules may be built for another OS.
 */

/**
 * External dependencies
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join( dirname( fileURLToPath( import.meta.url ) ), '..' );
const { version } = createRequire( import.meta.url )(
	'@playwright/test/package.json'
);
const args = process.argv.slice( 2 ).map( ( arg ) => `'${ arg }'` );

const build = spawnSync( 'pnpm', [ 'build-storybook' ], {
	cwd: root,
	env: { ...process.env, STORYBOOK_VISUAL_TESTS: '1' },
	shell: true,
	stdio: 'inherit',
} );
if ( build.status !== 0 ) {
	process.exit( build.status ?? 1 );
}

const script = [
	'set -e',
	'cp -r /src/playwright.config.ts /src/visual /src/storybook-static .',
	`echo '{"type":"module"}' > package.json`,
	`npm install --no-save --no-audit --no-fund @playwright/test@${ version }`,
	'status=0',
	`npx playwright test ${ args.join( ' ' ) } || status=$?`,
	'rm -rf /src/visual/__screenshots__ /src/test-results',
	'cp -r visual/__screenshots__ /src/visual/ 2>/dev/null || true',
	'cp -r test-results /src/ 2>/dev/null || true',
	'exit $status',
].join( '\n' );

const { status } = spawnSync(
	'docker',
	[
		'run',
		'--rm',
		'--ipc=host',
		'-e',
		'CI',
		'-v',
		`${ root }:/src`,
		'-w',
		'/work',
		`mcr.microsoft.com/playwright:v${ version }-noble`,
		'sh',
		'-c',
		script,
	],
	{ stdio: 'inherit' }
);

process.exit( status ?? 1 );
