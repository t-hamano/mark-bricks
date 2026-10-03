#!/usr/bin/env node
/**
 * Smoke test: opens a copy of `@mark-bricks/fixtures/smoke-test.md` in the
 * debug binary and waits for `report_rendered` to print that its blocks
 * rendered. Also checks that its `math` and `mermaid` previews rendered and
 * that the KaTeX fonts loaded, which the app's CSP could block. Then has the
 * app export a copy of `@mark-bricks/fixtures`'s Marp deck to PDF, and checks
 * its pages, their size and its title. Uses `xvfb-run` on headless Linux.
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

const deckFixturePath = path.join( path.dirname( fixturePath ), 'marp.md' );
const deckImagePath = path.join( path.dirname( fixturePath ), 'image.jpg' );

// The fixture deck: ten 16:9 slides, 1280 by 720 CSS pixels, so 960 by 540
// points. Its title comes from its first heading.
const EXPECTED_PDF =
	'10 pages, media box [0 0 960 540], title "Markdown Slides for Engineering Teams"';

const TIMEOUT_MS = Number( process.env.SMOKE_TIMEOUT_MS ?? 60000 );
// Longer than the app's own time limits for the three steps of the export,
// so that the app reports which step failed.
const PDF_TIMEOUT_MS = 200000;

if ( ! existsSync( binaryPath ) ) {
	console.error(
		`[smoke] Debug binary not found at ${ binaryPath }.\n` +
			`        Run \`pnpm build:debug\` first.`
	);
	process.exit( 1 );
}

const tempDir = await mkdtemp( path.join( os.tmpdir(), 'mark-bricks-' ) );
const documentPath = path.join( tempDir, 'smoke-test.md' );
await copyFile( fixturePath, documentPath );
const deckPath = path.join( tempDir, 'marp.md' );
await copyFile( deckFixturePath, deckPath );
await copyFile( deckImagePath, path.join( tempDir, 'image.jpg' ) );
const pdfPath = path.join( tempDir, 'marp.pdf' );

const needsXvfb =
	process.platform === 'linux' && ! process.env.DISPLAY && hasXvfbRun();

const [ cmd, args ] = needsXvfb
	? [ 'xvfb-run', [ '-a', binaryPath, documentPath ] ]
	: [ binaryPath, [ documentPath ] ];

console.log( `[smoke] launching: ${ cmd } ${ args.join( ' ' ) }` );
console.log( `[smoke] timeout: ${ TIMEOUT_MS }ms` );

const child = spawn( cmd, args, {
	env: {
		...process.env,
		MARK_BRICKS_SMOKE_TEST: '1',
		MARK_BRICKS_SMOKE_EXPORT_DECK: deckPath,
		MARK_BRICKS_SMOKE_EXPORT_PDF: pdfPath,
	},
	stdio: [ 'ignore', 'pipe', 'inherit' ],
} );

const expectedLine = `[smoke] rendered: ${ documentPath }`;
const PREVIEWS_PREFIX = '[smoke] previews: ';
// The export's result, or why it failed, after the steps it traces.
const PDF_RESULT = /^\[smoke\] pdf(?: error)?: /;
let previews = null;
let rendered = false;

const failure = await new Promise( ( resolve ) => {
	let timer = setTimeout(
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
		if ( line.startsWith( PREVIEWS_PREFIX ) ) {
			previews = JSON.parse( line.slice( PREVIEWS_PREFIX.length ) );
		}
		if ( line.trim() === expectedLine ) {
			rendered = true;
			const error = checkPreviews( previews );
			if ( error ) {
				finish( error );
			}
			clearTimeout( timer );
			timer = setTimeout(
				() => resolve( 'the app did not export the PDF' ),
				PDF_TIMEOUT_MS
			);
		}
		// The app exports the PDF once the editor has rendered.
		if ( rendered && PDF_RESULT.test( line ) ) {
			const result = line.replace( PDF_RESULT, '' );
			finish(
				result === EXPECTED_PDF
					? null
					: `the PDF export gave "${ result }", not "${ EXPECTED_PDF }"`
			);
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

/**
 * Checks the report of `inspectCodePreviews` from `@mark-bricks/editor`.
 *
 * @param {import('@mark-bricks/editor').CodePreviewReport | null} report
 * @return {string | null} What went wrong, or null.
 */
function checkPreviews( report ) {
	if ( ! report ) {
		return 'the app did not report the code block previews';
	}
	for ( const language of [ 'math', 'mermaid' ] ) {
		const preview = report.previews.find(
			( item ) => item.language === language
		);
		if ( preview?.status !== 'rendered' ) {
			return `the ${ language } preview is ${ preview?.status ?? 'missing' }`;
		}
	}
	for ( const family of [ 'KaTeX_Main', 'KaTeX_Math', 'KaTeX_Size2' ] ) {
		if ( ! report.katexFonts.some( ( font ) => font.family === family ) ) {
			return `${ family } was not loaded`;
		}
	}
	const failed = report.katexFonts.filter(
		( font ) => font.status !== 'loaded'
	);
	if ( failed.length > 0 ) {
		return `KaTeX fonts did not load: ${ JSON.stringify( failed ) }`;
	}
	return null;
}

function sleep( ms ) {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

function hasXvfbRun() {
	const result = spawnSync( 'which', [ 'xvfb-run' ], { stdio: 'ignore' } );
	return result.status === 0;
}
