/**
 * External dependencies
 */
import { describe, it, expect } from 'vitest';
import * as fixtures from '@mark-bricks/fixtures';

/**
 * Internal dependencies
 */
import { markdownToBlocks, blocksToMarkdown } from '.';

describe( 'converter round-trip', () => {
	it.each( Object.entries( fixtures ) )(
		'round-trips the %s fixture without loss',
		( _name, markdown ) => {
			expect( blocksToMarkdown( markdownToBlocks( markdown ) ) ).toBe(
				markdown
			);
		}
	);
} );
