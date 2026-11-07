/**
 * External dependencies
 */
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import {
	TabInputCustom,
	TabInputText,
	commands,
	createDocument,
	resetVscode,
	setActiveTab,
} from './__mocks__/vscode';
import { MARP_CONTEXT_KEY, trackMarpContext } from './marp-context';

const DECK = '---\nmarp: true\n---\n\n# One\n';

// The values `MARP_CONTEXT_KEY` was set to, in order.
function contextValues() {
	return commands.executeCommand.mock.calls
		.filter(
			( [ command, key ] ) =>
				command === 'setContext' && key === MARP_CONTEXT_KEY
		)
		.map( ( [ , , value ] ) => value );
}

beforeEach( () => {
	resetVscode();
} );

describe( 'Marp context key', () => {
	it( 'is false without an active tab', () => {
		trackMarpContext();

		expect( contextValues() ).toEqual( [ false ] );
	} );

	it.each( [
		[ 'text editor', ( uri: unknown ) => new TabInputText( uri as never ) ],
		[
			'visual editor',
			( uri: unknown ) =>
				new TabInputCustom( uri as never, 'markBricks.visualEditor' ),
		],
	] )( 'is true for a Marp deck in the %s', ( _name, createInput ) => {
		const document = createDocument( '/docs/deck.md', DECK );
		trackMarpContext();

		setActiveTab( createInput( document.uri ) );

		expect( contextValues() ).toEqual( [ false, true ] );
	} );

	it( 'is false for the slide preview of a Marp deck', () => {
		const document = createDocument( '/docs/deck.md', DECK );
		trackMarpContext();

		setActiveTab(
			new TabInputCustom( document.uri, 'markBricks.marpPreview' )
		);

		expect( contextValues() ).toEqual( [ false ] );
	} );

	it( 'is false for a document that is not markdown', () => {
		const document = createDocument( '/docs/deck.txt', DECK, 'plaintext' );
		trackMarpContext();

		setActiveTab( new TabInputText( document.uri ) );

		expect( contextValues() ).toEqual( [ false ] );
	} );

	it( 'follows edits to the active document', () => {
		const document = createDocument( '/docs/deck.md', '# Notes\n' );
		trackMarpContext();
		setActiveTab( new TabInputText( document.uri ) );

		document.setText( DECK );
		document.setText( '# Notes\n' );

		expect( contextValues() ).toEqual( [ false, true, false ] );
	} );

	it( 'ignores edits to other documents', () => {
		const active = createDocument( '/docs/notes.md', '# Notes\n' );
		const other = createDocument( '/docs/deck.md', '# Deck\n' );
		trackMarpContext();
		setActiveTab( new TabInputText( active.uri ) );

		other.setText( DECK );

		expect( contextValues() ).toEqual( [ false ] );
	} );
} );
