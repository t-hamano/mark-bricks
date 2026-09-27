#!/usr/bin/env node
/**
 * Cross-platform smoke test: does the Tauri app open a Markdown file and
 * render its blocks?
 *
 * Spawns the prebuilt debug binary with a copy of
 * `@mark-bricks/fixtures/smoke-test.md`, then waits for the app to print that
 * the editor canvas shows the file's blocks (see `report_rendered` in
 * `src-tauri/src/lib.rs`), and kills it.
 * - Fails if the binary exits, or does not report the render within the
 *   timeout.
 * - Wraps with `xvfb-run -a` on Linux when no DISPLAY is set, so the test can
 *   run in headless CI without a window server.
 */
import { spawn, spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );
const tauriAppRoot = path.resolve( __dirname, '..' );
const binaryName =
	process.platform === 'win32' ? 'mark-bricks.exe' : 'mark-bricks';
const binaryPath = path.join(
	tauriAppRoot,
	'src-tauri',
	'target',
	'debug',
	binaryName
);
const fixturePath = fileURLToPath(
	import.meta.resolve( '@mark-bricks/fixtures/smoke-test.md' )
);

const TIMEOUT_MS = Number( process.env.SMOKE_TIMEOUT_MS ?? 60000 );

if ( ! existsSync( binaryPath ) ) {
	console.error(
		`[smoke] Debug binary not found at ${ binaryPath }.\n` +
			`        Run \`pnpm build:debug\` first.`
	);
	process.exit( 1 );
}

// The editor may rewrite the markdown it loads, so open a copy of the fixture.
const tempDir = await mkdtemp( path.join( os.tmpdir(), 'mark-bricks-' ) );
const documentPath = path.join( tempDir, 'smoke-test.md' );
await copyFile( fixturePath, documentPath );

const needsXvfb =
	process.platform === 'linux' && ! process.env.DISPLAY && hasXvfbRun();

const [ cmd, args ] = needsXvfb
	? [ 'xvfb-run', [ '-a', binaryPath, documentPath ] ]
	: [ binaryPath, [ documentPath ] ];

console.log( `[smoke] launching: ${ cmd } ${ args.join( ' ' ) }` );
console.log( `[smoke] timeout: ${ TIMEOUT_MS }ms` );

const child = spawn( cmd, args, {
	env: { ...process.env, MARK_BRICKS_SMOKE_TEST: '1' },
	stdio: [ 'ignore', 'pipe', 'inherit' ],
} );

const expectedLine = `[smoke] rendered: ${ documentPath }`;

const failure = await new Promise( ( resolve ) => {
	const timer = setTimeout(
		() =>
			resolve(
				`the editor did not render the blocks of ${ documentPath }`
			),
		TIMEOUT_MS
	);
	const finish = ( error ) => {
		clearTimeout( timer );
		resolve( error );
	};

	createInterface( { input: child.stdout } ).on( 'line', ( line ) => {
		console.log( line );
		if ( line.trim() === expectedLine ) {
			finish( null );
		}
	} );
	child.on( 'exit', ( code, signal ) =>
		finish( `app exited (code=${ code }, signal=${ signal })` )
	);
	child.on( 'error', ( err ) =>
		finish( `failed to spawn binary: ${ err.message }` )
	);
} );

if ( child.exitCode === null && child.signalCode === null ) {
	console.log( '[smoke] terminating the app.' );
	child.kill( 'SIGTERM' );
	// Give it a moment to shut down, then SIGKILL if still alive.
	await sleep( 2000 );
	if ( child.exitCode === null && child.signalCode === null ) {
		child.kill( 'SIGKILL' );
	}
}

await rm( tempDir, { recursive: true, force: true } );

if ( failure ) {
	console.error( `[smoke] FAIL: ${ failure }` );
	process.exit( 1 );
}

console.log( '[smoke] OK' );
process.exit( 0 );

function sleep( ms ) {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

function hasXvfbRun() {
	const result = spawnSync( 'which', [ 'xvfb-run' ], { stdio: 'ignore' } );
	return result.status === 0;
}
