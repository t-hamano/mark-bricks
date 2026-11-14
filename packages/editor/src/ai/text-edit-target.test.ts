/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import {
	createTextEditTarget,
	type TextEditorAccess,
	type TextRange,
} from './text-edit-target';

// A text editor holding `value`, with `[start, end]` selected. Tracked
// ranges move with edits made before them, as Monaco's decorations do.
function setup( value: string, start: number, end = start ) {
	let text = value;
	const tracked: Array< TextRange | null > = [];
	let undoSteps = 0;
	const access: TextEditorAccess = {
		getValue: () => text,
		getSelection: () => ( { start, end } ),
		trackRange: ( range ) => {
			const index = tracked.push( { ...range } ) - 1;
			return () => tracked[ index ];
		},
		replaceRange: ( range, replacement ) => {
			text =
				text.slice( 0, range.start ) +
				replacement +
				text.slice( range.end );
			undoSteps++;
		},
	};
	return {
		access,
		getText: () => text,
		getUndoSteps: () => undoSteps,
		// Simulates typing `inserted` at `offset`, before the tracked ranges.
		typeAt: ( offset: number, inserted: string ) => {
			text = text.slice( 0, offset ) + inserted + text.slice( offset );
			for ( const range of tracked ) {
				if ( range && range.start >= offset ) {
					range.start += inserted.length;
					range.end += inserted.length;
				}
			}
		},
		loseRanges: () => tracked.fill( null ),
	};
}

const DOCUMENT = '# Title\n\nFirst line.\nSecond line.\n\nLast.\n';
const FIRST = DOCUMENT.indexOf( 'First' );
const SECOND_END = DOCUMENT.indexOf( '\n\nLast' );

describe( 'createTextEditTarget', () => {
	describe( 'getContext', () => {
		it( 'returns the selected text and marks it in the document', () => {
			const { access } = setup( DOCUMENT, FIRST, SECOND_END );
			expect( createTextEditTarget( access ).getContext() ).toEqual( {
				selection: 'First line.\nSecond line.',
				document:
					'# Title\n\n<selection>First line.\nSecond line.</selection>\n\nLast.\n',
			} );
		} );

		it( 'selects the line the cursor is on when nothing is selected', () => {
			const { access } = setup( DOCUMENT, FIRST + 3 );
			expect(
				createTextEditTarget( access ).getContext().selection
			).toBe( 'First line.' );
		} );

		it( 'selects the last line when it has no line break', () => {
			const { access } = setup( 'One\nTwo', 6 );
			expect(
				createTextEditTarget( access ).getContext().selection
			).toBe( 'Two' );
		} );
	} );

	describe( 'apply', () => {
		it( 'replaces the selection in one undo step', () => {
			const { access, getText, getUndoSteps } = setup(
				DOCUMENT,
				FIRST,
				SECOND_END
			);
			expect(
				createTextEditTarget( access ).apply( {
					action: 'replace',
					markdown: '- New\n',
				} )
			).toBe( true );
			expect( getText() ).toBe( '# Title\n\n- New\n\nLast.\n' );
			expect( getUndoSteps() ).toBe( 1 );
		} );

		it( 'keeps the line break that ended the selection', () => {
			const { access, getText } = setup(
				DOCUMENT,
				FIRST,
				SECOND_END + 1
			);
			createTextEditTarget( access ).apply( {
				action: 'replace',
				markdown: 'New.',
			} );
			expect( getText() ).toBe( '# Title\n\nNew.\n\nLast.\n' );
		} );

		it( 'inserts after the last selected line, separated by blank lines', () => {
			const { access, getText } = setup( DOCUMENT, FIRST, FIRST + 5 );
			createTextEditTarget( access ).apply( {
				action: 'insert_after',
				markdown: 'New.\n',
			} );
			expect( getText() ).toBe(
				'# Title\n\nFirst line.\n\nNew.\n\nSecond line.\n\nLast.\n'
			);
		} );

		it( 'does not add a blank line before an existing one', () => {
			const { access, getText } = setup( DOCUMENT, FIRST, SECOND_END );
			createTextEditTarget( access ).apply( {
				action: 'insert_after',
				markdown: 'New.',
			} );
			expect( getText() ).toBe(
				'# Title\n\nFirst line.\nSecond line.\n\nNew.\n\nLast.\n'
			);
		} );

		it( 'inserts at the end of the document', () => {
			const { access, getText } = setup( 'One\nTwo', 6 );
			createTextEditTarget( access ).apply( {
				action: 'insert_after',
				markdown: 'Three',
			} );
			expect( getText() ).toBe( 'One\nTwo\n\nThree' );
		} );

		it( 'follows the selection when text is typed before it', () => {
			const { access, getText, typeAt } = setup(
				DOCUMENT,
				FIRST,
				SECOND_END
			);
			const target = createTextEditTarget( access );
			typeAt( 0, 'Intro.\n\n' );
			target.apply( { action: 'replace', markdown: 'New.' } );
			expect( getText() ).toBe( 'Intro.\n\n# Title\n\nNew.\n\nLast.\n' );
		} );

		it( 'rewrites malformed front matter in the edit', () => {
			const { access, getText } = setup( '', 0 );
			createTextEditTarget( access ).apply( {
				action: 'replace',
				markdown: '---\n\nmarp: true\n\n--------\n\n# Slide\n',
			} );
			expect( getText() ).toBe( '---\nmarp: true\n---\n\n# Slide' );
		} );

		it( 'replaces the front matter at the top when the selection is below it', () => {
			const value = '---\nmarp: true\n---\n\n# Title\n\nBody.\n';
			const { access, getText } = setup( value, value.indexOf( 'Body' ) );
			createTextEditTarget( access ).apply( {
				action: 'replace',
				markdown: '---\nmarp: true\ntheme: gaia\n---\n\nNew body.\n',
			} );
			expect( getText() ).toBe(
				'---\nmarp: true\ntheme: gaia\n---\n\n# Title\n\nNew body.\n'
			);
		} );

		it( 'replaces the whole front matter when the cursor is inside it', () => {
			const value = '---\nmarp: true\ntheme: default\n---\n\n# Title\n';
			const { access, getText, getUndoSteps } = setup(
				value,
				value.indexOf( 'theme' )
			);
			createTextEditTarget( access ).apply( {
				action: 'replace',
				markdown: '---\nmarp: true\ntheme: gaia\n---\n',
			} );
			expect( getText() ).toBe(
				'---\nmarp: true\ntheme: gaia\n---\n\n# Title\n'
			);
			expect( getUndoSteps() ).toBe( 1 );
		} );

		it( 'changes the front matter and the body in one undo step', () => {
			const value = '---\nmarp: true\n---\n\n# Title\n\nBody.\n';
			const { access, getUndoSteps } = setup(
				value,
				value.indexOf( 'Body' )
			);
			createTextEditTarget( access ).apply( {
				action: 'replace',
				markdown: '---\nmarp: true\ntheme: gaia\n---\n\nNew body.\n',
			} );
			expect( getUndoSteps() ).toBe( 1 );
		} );

		it( 'adds front matter at the top of a document without one', () => {
			const { access, getText } = setup( '# Title\n', 3 );
			createTextEditTarget( access ).apply( {
				action: 'insert_after',
				markdown: '---\nmarp: true\n---\n',
			} );
			expect( getText() ).toBe( '---\nmarp: true\n---\n\n# Title\n' );
		} );

		it( 'changes nothing when the selection no longer exists', () => {
			const { access, getText, loseRanges } = setup( DOCUMENT, FIRST );
			const target = createTextEditTarget( access );
			loseRanges();
			expect(
				target.apply( { action: 'replace', markdown: 'New.' } )
			).toBe( false );
			expect( getText() ).toBe( DOCUMENT );
		} );
	} );
} );
