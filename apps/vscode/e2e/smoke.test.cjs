/* global suite, suiteSetup, suiteTeardown, test */
/**
 * Smoke test run in a real VS Code by `@vscode/test-cli`, against the built
 * extension in `dist/`. Run `pnpm build` first.
 */
const assert = require( 'node:assert' );
const fs = require( 'node:fs/promises' );
const os = require( 'node:os' );
const path = require( 'node:path' );
const vscode = require( 'vscode' );

const EXTENSION_ID = 'aki-hamano.mark-bricks-vscode';
const VIEW_TYPE = 'markBricks.visualEditor';
const FIXTURE_PATH = require.resolve( '@mark-bricks/fixtures/smoke-test.md' );

/**
 * Resolves once `condition` returns true, or rejects after `timeout`.
 *
 * @param {() => boolean} condition Checked every 100ms.
 * @param {number}        timeout   Milliseconds to wait.
 * @param {string}        message   Error message on timeout.
 */
async function waitFor( condition, timeout, message ) {
	const deadline = Date.now() + timeout;
	while ( ! condition() ) {
		if ( Date.now() > deadline ) {
			throw new Error( message );
		}
		await new Promise( ( resolve ) => setTimeout( resolve, 100 ) );
	}
}

suite( 'MarkBricks smoke test', () => {
	let tempDir;
	let documentUri;

	// The editor may rewrite the markdown it loads, so edit a copy of the
	// fixture.
	suiteSetup( async () => {
		tempDir = await fs.mkdtemp( path.join( os.tmpdir(), 'mark-bricks-' ) );
		const documentPath = path.join( tempDir, 'smoke-test.md' );
		await fs.copyFile( FIXTURE_PATH, documentPath );
		documentUri = vscode.Uri.file( documentPath );
	} );

	suiteTeardown( async () => {
		// Revert first so closing a changed document doesn't prompt to save.
		await vscode.commands.executeCommand(
			'workbench.action.revertAndCloseActiveEditor'
		);
		await fs.rm( tempDir, { recursive: true, force: true } );
	} );

	test( 'opens a markdown file in the visual editor', async () => {
		const extension = vscode.extensions.getExtension( EXTENSION_ID );
		assert.ok( extension, `${ EXTENSION_ID } is not installed` );

		await vscode.commands.executeCommand(
			'vscode.openWith',
			documentUri,
			VIEW_TYPE
		);

		// Opening the custom editor activates the extension. `activate`
		// rejects with the error `activate` threw, if any.
		const api = await extension.activate();

		const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
		assert.ok(
			input instanceof vscode.TabInputCustom,
			'The active tab is not a custom editor'
		);
		assert.strictEqual( input.viewType, VIEW_TYPE );
		assert.strictEqual( input.uri.toString(), documentUri.toString() );

		await waitFor(
			() => api.isEditorRendered( documentUri ),
			60000,
			'The editor canvas did not show the blocks'
		);
	} );

	// Font URLs and the webview's CSP differ from Storybook's, so check that
	// the KaTeX fonts load here too.
	test( 'renders the math and mermaid previews', async () => {
		const api = vscode.extensions.getExtension( EXTENSION_ID ).exports;

		await waitFor(
			() => api.getCodePreviews( documentUri ) !== null,
			60000,
			'The webview did not report the code block previews'
		);
		const { previews, katexFonts } = api.getCodePreviews( documentUri );

		for ( const language of [ 'math', 'mermaid' ] ) {
			const preview = previews.find(
				( item ) => item.language === language
			);
			assert.strictEqual(
				preview?.status,
				'rendered',
				`The ${ language } preview did not render`
			);
		}
		assert.ok( katexFonts.length > 0, 'No KaTeX font was loaded' );
		assert.deepStrictEqual(
			katexFonts.filter( ( font ) => font.status !== 'loaded' ),
			[],
			'KaTeX fonts did not load'
		);
	} );
} );
