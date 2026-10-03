/**
 * External dependencies
 */
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Internal dependencies
 */
import {
	FakeTextDocument,
	TabInputText,
	Uri,
	addWorkspaceFolder,
	createDocument,
	env,
	resetVscode,
	runCommand,
	setActiveTab,
	window,
	workspace,
} from '../__mocks__/vscode';
import { exportSlideDeck, registerExportCommand } from '.';

const { marpCli, CLIError, CLIErrorCode } = vi.hoisted( () => {
	class MockCLIError extends Error {
		public constructor(
			message: string,
			public readonly errorCode: number
		) {
			super( message );
		}
	}
	return {
		marpCli: vi.fn(),
		CLIError: MockCLIError,
		CLIErrorCode: { NOT_FOUND_BROWSER: 2 },
	};
} );

vi.mock( './load-marp-cli', () => ( {
	getMarpCliPath: ( extensionPath: string ) =>
		`${ extensionPath }/dist/marp-cli.cjs`,
	loadMarpCli: () => ( { marpCli, CLIError, CLIErrorCode } ),
} ) );

const EXTENSION_PATH = '/extension';
const DECK = '---\nmarp: true\ntitle: Deck\n---\n\n# One\n';

let folder: string;

// A path as `Uri.fsPath` spells it, with a lower-case drive letter.
const fsPath = ( filePath: string ) => Uri.file( filePath ).fsPath;

// The work file Marp CLI was asked to read.
const marpCliInput = () => marpCli.mock.calls[ 0 ][ 0 ][ 0 ] as string;

beforeEach( async () => {
	resetVscode();
	marpCli.mockReset();
	marpCli.mockResolvedValue( 0 );
	registerExportCommand( {
		extensionPath: EXTENSION_PATH,
	} as never );
	folder = await mkdtemp( path.join( tmpdir(), 'mark-bricks-export-' ) );
} );

afterEach( async () => {
	vi.restoreAllMocks();
	await rm( folder, { recursive: true, force: true } );
} );

describe( 'exportSlideDeck', () => {
	it( 'writes the HTML with the extension host file system', async () => {
		const document = createDocument( path.join( folder, 'deck.md' ), DECK );
		const output = Uri.file( path.join( folder, 'deck.html' ) );

		await exportSlideDeck( document as never, output as never );

		expect( marpCli ).not.toHaveBeenCalled();
		const [ uri, content ] = workspace.fs.writeFile.mock.calls[ 0 ];
		expect( uri ).toBe( output );
		const html = new TextDecoder().decode( content );
		expect( html ).toMatch( /^<!DOCTYPE html>/ );
		expect( html ).toContain( '<title>Deck</title>' );
	} );

	it( 'exports a file ending with .pdf to PDF with Marp CLI', async () => {
		const document = createDocument( path.join( folder, 'deck.md' ), DECK );
		const output = Uri.file( path.join( folder, 'deck.PDF' ) );

		await exportSlideDeck( document as never, output as never );

		expect( workspace.fs.writeFile ).not.toHaveBeenCalled();
		expect( marpCli ).toHaveBeenCalledWith( [
			document.uri.fsPath,
			'--pdf',
			'--output',
			output.fsPath,
			'--allow-local-files',
			'--no-config-file',
			'--engine',
			`${ EXTENSION_PATH }/dist/marp-cli.cjs`,
		] );
	} );

	it( 'exports unsaved edits from a hidden file next to the deck', async () => {
		const document = createDocument( path.join( folder, 'deck.md' ), DECK );
		document.isDirty = true;
		let workFileText = '';
		marpCli.mockImplementation( async ( [ input ]: string[] ) => {
			workFileText = await import( 'node:fs/promises' ).then( ( fs ) =>
				fs.readFile( input, 'utf8' )
			);
			return 0;
		} );

		await exportSlideDeck(
			document as never,
			Uri.file( path.join( folder, 'deck.pdf' ) ) as never
		);

		expect( path.dirname( marpCliInput() ) ).toBe( fsPath( folder ) );
		expect( path.basename( marpCliInput() ) ).toMatch(
			/^\.mark-bricks-export-.+\.md$/
		);
		expect( workFileText ).toBe( DECK );
		// The work file is gone.
		expect( await readdir( folder ) ).toEqual( [] );
	} );

	it( 'exports a file saved in another encoding from a UTF-8 copy', async () => {
		const document = createDocument( path.join( folder, 'deck.md' ), DECK );
		document.encoding = 'shiftjis';

		await exportSlideDeck(
			document as never,
			Uri.file( path.join( folder, 'deck.pdf' ) ) as never
		);

		expect( marpCliInput() ).not.toBe( document.uri.fsPath );
	} );

	it( 'exports an unsaved document from the temporary directory', async () => {
		const document = new FakeTextDocument(
			Uri.parse( 'untitled:Untitled-1' ),
			DECK
		);

		await exportSlideDeck(
			document as never,
			Uri.file( path.join( folder, 'deck.pdf' ) ) as never
		);

		expect( path.dirname( marpCliInput() ) ).toBe( tmpdir() );
	} );

	it( 'copies a PDF to an output that is not on the local file system', async () => {
		const document = createDocument( path.join( folder, 'deck.md' ), DECK );
		const output = Uri.parse( 'vscode-remote://host/deck.pdf' );

		await exportSlideDeck( document as never, output as never );

		const cliOutput = marpCli.mock.calls[ 0 ][ 0 ][ 3 ];
		expect( path.dirname( cliOutput ) ).toBe( tmpdir() );
		expect( workspace.fs.copy ).toHaveBeenCalledWith(
			Uri.file( cliOutput ),
			output,
			{ overwrite: true }
		);
	} );

	it( 'removes the work file when Marp CLI fails', async () => {
		const document = createDocument( path.join( folder, 'deck.md' ), DECK );
		document.isDirty = true;
		marpCli.mockRejectedValue( new Error( 'boom' ) );

		await expect(
			exportSlideDeck(
				document as never,
				Uri.file( path.join( folder, 'deck.pdf' ) ) as never
			)
		).rejects.toThrow( 'boom' );
		expect( await readdir( folder ) ).toEqual( [] );
	} );
} );

describe( 'markBricks.exportSlideDeck', () => {
	function openDeck( text = DECK ) {
		const document = createDocument( path.join( folder, 'deck.md' ), text );
		setActiveTab( new TabInputText( document.uri ) );
		return document;
	}

	it( "suggests the deck's name with the HTML and PDF filters", async () => {
		openDeck();

		await runCommand( 'markBricks.exportSlideDeck' );

		const [ options ] = window.showSaveDialog.mock.calls[ 0 ];
		expect( options.defaultUri.fsPath ).toBe(
			fsPath( path.join( folder, 'deck.html' ) )
		);
		expect( options.filters ).toEqual( {
			'HTML slide deck': [ 'html' ],
			'PDF slide deck': [ 'pdf' ],
		} );
	} );

	it( 'suggests "untitled" for an unsaved document', async () => {
		addWorkspaceFolder( folder );
		const document = new FakeTextDocument(
			Uri.parse( 'untitled:Untitled-1' ),
			DECK
		);
		vi.spyOn( workspace, 'textDocuments', 'get' ).mockReturnValue( [
			document,
		] );
		setActiveTab( new TabInputText( document.uri ) );

		await runCommand( 'markBricks.exportSlideDeck' );

		const [ options ] = window.showSaveDialog.mock.calls[ 0 ];
		expect( options.defaultUri.fsPath ).toBe(
			fsPath( path.join( folder, 'untitled.html' ) )
		);
	} );

	it( 'does nothing when the dialog is canceled', async () => {
		openDeck();
		window.showSaveDialog.mockResolvedValue( undefined );

		await runCommand( 'markBricks.exportSlideDeck' );

		expect( window.withProgress ).not.toHaveBeenCalled();
	} );

	it( 'offers to open the exported file', async () => {
		openDeck();
		window.showSaveDialog.mockResolvedValue(
			Uri.file( path.join( folder, 'deck.html' ) )
		);

		await runCommand( 'markBricks.exportSlideDeck' );

		expect( window.showInformationMessage ).toHaveBeenCalledWith(
			'Exported the slide deck to deck.html.',
			'Open'
		);
	} );

	it( 'does not offer to open a file on a remote host', async () => {
		openDeck();
		env.remoteName = 'ssh-remote';
		window.showSaveDialog.mockResolvedValue(
			Uri.file( path.join( folder, 'deck.html' ) )
		);

		await runCommand( 'markBricks.exportSlideDeck' );

		expect( window.showInformationMessage ).toHaveBeenCalledWith(
			'Exported the slide deck to deck.html.'
		);
	} );

	it( 'explains which browsers PDF export needs', async () => {
		openDeck();
		window.showSaveDialog.mockResolvedValue(
			Uri.file( path.join( folder, 'deck.pdf' ) )
		);
		marpCli.mockRejectedValue(
			new CLIError( 'No browser', CLIErrorCode.NOT_FOUND_BROWSER )
		);

		await runCommand( 'markBricks.exportSlideDeck' );

		const [ message ] = window.showErrorMessage.mock.calls[ 0 ];
		expect( message ).toMatch( /^Exporting to PDF requires / );
		for ( const browser of [ 'Chrome', 'Edge', 'Firefox' ] ) {
			expect( message ).toContain( browser );
		}
		expect( window.showInformationMessage ).not.toHaveBeenCalled();
	} );

	it( "shows Marp CLI's other errors with their message", async () => {
		openDeck();
		window.showSaveDialog.mockResolvedValue(
			Uri.file( path.join( folder, 'deck.pdf' ) )
		);
		marpCli.mockRejectedValue( new Error( 'Failed converting Markdown.' ) );

		await runCommand( 'markBricks.exportSlideDeck' );

		expect( window.showErrorMessage ).toHaveBeenCalledWith(
			'Could not export the slide deck: Failed converting Markdown.'
		);
	} );

	it( 'reports an exit code other than 0 as an error', async () => {
		openDeck();
		window.showSaveDialog.mockResolvedValue(
			Uri.file( path.join( folder, 'deck.pdf' ) )
		);
		marpCli.mockResolvedValue( 1 );

		await runCommand( 'markBricks.exportSlideDeck' );

		expect( window.showErrorMessage ).toHaveBeenCalledWith(
			'Could not export the slide deck: Marp CLI exited with code 1.'
		);
	} );
} );
