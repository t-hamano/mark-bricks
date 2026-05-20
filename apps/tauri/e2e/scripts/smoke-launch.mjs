#!/usr/bin/env node
/**
 * Cross-platform "does the Tauri app launch?" smoke test.
 *
 * Spawns the prebuilt debug binary, waits a few seconds, then kills it.
 * - Exits early with a non-zero status if the binary crashes/exits within the
 *   liveness window.
 * - Wraps with `xvfb-run -a` on Linux when no DISPLAY is set, so the test can
 *   run in headless CI without a window server.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );
const tauriAppRoot = path.resolve( __dirname, '..', '..' );
const binaryName =
	process.platform === 'win32' ? 'mark-bricks.exe' : 'mark-bricks';
const binaryPath = path.join(
	tauriAppRoot,
	'src-tauri',
	'target',
	'debug',
	binaryName
);

const LIVENESS_MS = Number( process.env.SMOKE_LIVENESS_MS ?? 8000 );

if ( ! existsSync( binaryPath ) ) {
	console.error(
		`[smoke] Debug binary not found at ${ binaryPath }.\n` +
			`        Run \`pnpm tauri build --debug --no-bundle\` first.`
	);
	process.exit( 1 );
}

const needsXvfb =
	process.platform === 'linux' && ! process.env.DISPLAY && hasXvfbRun();

const [ cmd, args ] = needsXvfb
	? [ 'xvfb-run', [ '-a', binaryPath ] ]
	: [ binaryPath, [] ];

console.log( `[smoke] launching: ${ cmd } ${ args.join( ' ' ) }` );
console.log( `[smoke] liveness window: ${ LIVENESS_MS }ms` );

const child = spawn( cmd, args, {
	stdio: [ 'ignore', 'inherit', 'inherit' ],
} );

let earlyExit = null;
child.on( 'exit', ( code, signal ) => {
	earlyExit = { code, signal };
} );
child.on( 'error', ( err ) => {
	console.error( '[smoke] failed to spawn binary:', err );
	process.exit( 1 );
} );

await sleep( LIVENESS_MS );

if ( earlyExit ) {
	console.error(
		`[smoke] FAIL: app exited within liveness window (code=${ earlyExit.code }, signal=${ earlyExit.signal })`
	);
	process.exit( 1 );
}

console.log( '[smoke] app stayed alive — terminating.' );
child.kill( 'SIGTERM' );
// Give it a moment to shut down, then SIGKILL if still alive.
await sleep( 2000 );
if ( ! child.killed ) {
	child.kill( 'SIGKILL' );
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
