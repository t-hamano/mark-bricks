/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import {
	describeBlockSelection,
	describeTextSelection,
} from './selection-summary';

describe( 'describeBlockSelection', () => {
	it( 'counts the selected blocks', () => {
		expect( describeBlockSelection( 0 ) ).toBe( 'No block selected' );
		expect( describeBlockSelection( 1 ) ).toBe( '1 block selected' );
		expect( describeBlockSelection( 3 ) ).toBe( '3 blocks selected' );
	} );
} );

describe( 'describeTextSelection', () => {
	it( 'names the line the cursor is on, without a selection', () => {
		expect(
			describeTextSelection( { isEmpty: true, startLine: 4, endLine: 4 } )
		).toBe( 'Line 4' );
	} );

	it( 'counts the selected lines', () => {
		expect(
			describeTextSelection( {
				isEmpty: false,
				startLine: 4,
				endLine: 4,
			} )
		).toBe( '1 line selected' );
		expect(
			describeTextSelection( {
				isEmpty: false,
				startLine: 2,
				endLine: 6,
			} )
		).toBe( '5 lines selected' );
	} );
} );
