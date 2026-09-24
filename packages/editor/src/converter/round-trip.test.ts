/**
 * External dependencies
 */
import { describe, it, expect } from 'vitest';
import * as fixtures from '@mark-bricks/fixtures';

/**
 * Internal dependencies
 */
import {
	blocksToMarkdown,
	joinFrontMatter,
	markdownToBlocks,
	splitFrontMatter,
} from '.';

describe( 'converter round-trip', () => {
	// Mirrors how the editor loads and saves a document.
	it.each( Object.entries( fixtures ) )(
		'round-trips the %s fixture without loss',
		( _name, markdown ) => {
			const { frontMatter, body } = splitFrontMatter( markdown );
			expect(
				joinFrontMatter(
					frontMatter,
					blocksToMarkdown( markdownToBlocks( body ) )
				)
			).toBe( markdown );
		}
	);
} );
