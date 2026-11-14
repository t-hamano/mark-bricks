/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import {
	blocksToMarkdown,
	blockToMarkdown,
	joinFrontMatter,
	markdownToBlocks,
	splitFrontMatter,
} from '../converter';
import type { AiEditResult } from '../platform';
import { joinAroundSelection, type EditTarget } from './edit-target';
import { findUniqueText } from './find-text';
import { splitAiFrontMatter } from './front-matter';

/**
 * The parts of the block editor store the target reads and changes.
 * `select( blockEditorStore )` and `dispatch( blockEditorStore )` provide
 * them.
 */
export type BlockEditorAccess = {
	getBlocks: () => Block[];
	getSelectedBlockClientIds: () => string[];
	getBlockHierarchyRootClientId: ( clientId: string ) => string;
	replaceBlocks: ( clientIds: string[], blocks: Block[] ) => void;
	insertBlocks: ( blocks: Block[], index?: number ) => void;
};

/**
 * Returns the top-level blocks that contain the selected blocks, in
 * document order. An edit replaces whole top-level blocks, so selecting a
 * list item edits the list it belongs to.
 *
 * @param access Block editor access.
 * @return Client IDs of the top-level blocks.
 */
function getSelectedRootClientIds( access: BlockEditorAccess ): string[] {
	const roots = new Set(
		access
			.getSelectedBlockClientIds()
			.map( ( clientId ) =>
				access.getBlockHierarchyRootClientId( clientId )
			)
	);
	return access
		.getBlocks()
		.map( ( block ) => block.clientId )
		.filter( ( clientId ) => roots.has( clientId ) );
}

/**
 * Changes the document's front matter.
 */
export type FrontMatterAccess = {
	/**
	 * Returns the document's front matter now. Omitted when the front
	 * matter given to the target stays current.
	 */
	get?: () => string | null;
	/**
	 * Replaces the front matter as its own undo step.
	 */
	set: ( next: string ) => void;
	/**
	 * Replaces the front matter as part of the block change just made.
	 */
	merge: ( next: string ) => void;
};

/**
 * Replaces the one place in the document whose Markdown is `find` with
 * `markdown`. Only the top-level blocks the text belongs to are rebuilt, so
 * the other blocks stay as they are. Text inside the front matter changes
 * the front matter instead.
 *
 * @param access            Block editor access.
 * @param frontMatter       The document's front matter.
 * @param frontMatterAccess Changes the document's front matter.
 * @param find              The Markdown to replace.
 * @param markdown          The Markdown to put in its place.
 * @return What became of the edit.
 */
function replaceText(
	access: BlockEditorAccess,
	frontMatter: string | null,
	frontMatterAccess: FrontMatterAccess | undefined,
	find: string,
	markdown: string
): AiEditResult {
	const blocks = access.getBlocks();
	// Each block's Markdown, where it starts in the body, and the blocks
	// with none, which blocksToMarkdown leaves out.
	const segments: { clientId: string; start: number; end: number }[] = [];
	let length = 0;
	blocks.forEach( ( block ) => {
		const text = blockToMarkdown( block );
		if ( text === '' ) {
			return;
		}
		if ( segments.length ) {
			length += 2;
		}
		segments.push( {
			clientId: block.clientId,
			start: length,
			end: length + text.length,
		} );
		length += text.length;
	} );
	const body = blocksToMarkdown( blocks );
	const document = joinFrontMatter(
		frontMatterAccess?.get ? frontMatterAccess.get() : frontMatter,
		body
	);
	const headerLength = document.length - body.length;

	const found = findUniqueText( document, find );
	if ( 'reason' in found ) {
		return { status: 'failed', reason: found.reason };
	}

	if ( found.start < headerLength ) {
		if ( found.end > headerLength || ! frontMatterAccess ) {
			return {
				status: 'failed',
				reason: 'The "find" text must be all in the front matter, or all after it. Edit them separately.',
			};
		}
		const header = document.slice( 0, headerLength );
		const next = splitFrontMatter(
			header.slice( 0, found.start ) +
				markdown +
				header.slice( found.end )
		);
		// Text left after the front matter would be lost.
		if ( next.frontMatter === null || next.body.trim() !== '' ) {
			return {
				status: 'failed',
				reason: 'The edit would break the front matter. Replace only the lines inside it, without "---" lines, and try again.',
			};
		}
		frontMatterAccess.set( next.frontMatter );
		return { status: 'applied' };
	}

	// The blocks the text touches, including the blank line between two
	// blocks.
	const start = found.start - headerLength;
	const end = found.end - headerLength;
	const touched = segments.filter(
		( segment ) => segment.start <= end && segment.end >= start
	);
	if ( touched.length === 0 ) {
		return {
			status: 'failed',
			reason: 'The "find" text has no content of the document. Include the text to change, and try again.',
		};
	}
	const from = touched[ 0 ].start;
	const to = touched[ touched.length - 1 ].end;
	const replaced =
		body.slice( Math.min( from, start ), start ) +
		markdown +
		body.slice( end, Math.max( to, end ) );
	access.replaceBlocks(
		touched.map( ( segment ) => segment.clientId ),
		markdownToBlocks( replaced )
	);
	return { status: 'applied' };
}

/**
 * Creates the edit target for the visual editor, from the blocks selected
 * now. With no block selected, the selection is empty, and edits are added
 * at the end of the document.
 *
 * Front matter at the start of the model's Markdown replaces the
 * document's front matter instead of becoming blocks. A `replace_text` edit
 * changes the text it names instead, wherever it is.
 *
 * @param access            Block editor access.
 * @param frontMatter       The document's front matter, sent as part of
 *                          the document.
 * @param frontMatterAccess Changes the document's front matter.
 * @return The edit target.
 */
export function createBlockEditTarget(
	access: BlockEditorAccess,
	frontMatter: string | null = null,
	frontMatterAccess?: FrontMatterAccess
): EditTarget {
	const clientIds = getSelectedRootClientIds( access );

	return {
		getContext() {
			const blocks = access.getBlocks();
			const selected = new Set( clientIds );
			const indexes = blocks
				.map( ( block, index ) =>
					selected.has( block.clientId ) ? index : -1
				)
				.filter( ( index ) => index !== -1 );
			const start = indexes.length
				? Math.min( ...indexes )
				: blocks.length;
			const end = indexes.length ? Math.max( ...indexes ) + 1 : start;
			return joinAroundSelection(
				joinFrontMatter(
					frontMatter,
					blocksToMarkdown( blocks.slice( 0, start ) )
				),
				blocksToMarkdown( blocks.slice( start, end ) ),
				blocksToMarkdown( blocks.slice( end ) )
			);
		},

		getDocument() {
			return joinAroundSelection(
				joinFrontMatter(
					frontMatterAccess?.get
						? frontMatterAccess.get()
						: frontMatter,
					blocksToMarkdown( access.getBlocks() )
				),
				'',
				''
			).document;
		},

		apply( edit ) {
			if ( edit.action === 'replace_text' ) {
				return replaceText(
					access,
					frontMatter,
					frontMatterAccess,
					edit.find,
					edit.markdown
				);
			}
			const { action, markdown } = edit;
			const blocks = access.getBlocks();
			const indexes = clientIds.map( ( clientId ) =>
				blocks.findIndex( ( block ) => block.clientId === clientId )
			);
			if ( indexes.includes( -1 ) ) {
				return { status: 'dropped' };
			}
			const split = frontMatterAccess
				? splitAiFrontMatter( markdown )
				: { frontMatter: null, body: markdown };
			// An edit of the front matter alone leaves the blocks as they
			// are.
			if ( split.frontMatter !== null && split.body.trim() === '' ) {
				frontMatterAccess?.set( split.frontMatter );
				return { status: 'applied' };
			}
			const newBlocks = markdownToBlocks( split.body );

			if ( clientIds.length === 0 ) {
				access.insertBlocks( newBlocks, blocks.length );
			} else if ( action === 'replace' ) {
				access.replaceBlocks( clientIds, newBlocks );
			} else {
				access.insertBlocks( newBlocks, Math.max( ...indexes ) + 1 );
			}
			// The block change above has made the undo step, which the front
			// matter joins, so one undo reverts the whole edit.
			if ( split.frontMatter !== null ) {
				frontMatterAccess?.merge( split.frontMatter );
			}
			return { status: 'applied' };
		},
	};
}
