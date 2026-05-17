/**
 * External dependencies
 */
import type { RootContent } from 'mdast';
import type { Options } from 'remark-stringify';

/**
 * WordPress dependencies
 */
import {
	type Block,
	type BlockEditProps as CoreBlockEditProps,
} from '@wordpress/blocks';

export type BlockEditProps<
	Attributes extends Block[ 'attributes' ] = Block[ 'attributes' ],
> = CoreBlockEditProps< Attributes > & {
	// Gutenberg runtime injects these editor callbacks, but @wordpress/blocks typings do not expose them on BlockEditProps.
	mergeBlocks?: ( forward?: boolean ) => void;
	onReplace?: ( ...args: unknown[] ) => void;
	onRemove?: () => void;
	insertBlocksAfter?: ( blocks: unknown ) => void;
};

/**
 * The result of converting a block into an mdast node.
 *
 * `options` carries the remark-stringify options required to render the node
 * back to its original Markdown syntax (e.g. setext headings, tilde fences).
 * Each block module owns the mapping from its `markdownData` attribute to
 * these options.
 */
export type NodeResult< T extends RootContent = RootContent > = {
	node: T;
	options?: Options;
};
