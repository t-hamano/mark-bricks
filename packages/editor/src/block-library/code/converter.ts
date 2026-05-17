/**
 * External dependencies
 */
import type { Code } from 'mdast';

/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';
import { RichTextData } from '@wordpress/rich-text';

/**
 * Internal dependencies
 */
import { createBlock } from '../utils';
import type { NodeResult } from '../types';
import type { BlockAttributes, CodeFormat } from './types';

function detectFormat( node: Code, source: string ): CodeFormat {
	if ( ! node.position ) {
		return 'fenced-backtick';
	}
	const offset = node.position.start.offset ?? 0;
	const char = source[ offset ];
	if ( char === '~' ) {
		return 'fenced-tilde';
	}
	if ( char === '`' ) {
		return 'fenced-backtick';
	}
	return 'indented';
}

/**
 * Converts an mdast Code node into a `core/code` block.
 *
 * CommonMark defines three code block syntaxes, all of which parse to the
 * same mdast Code node. The original syntax is kept for round-tripping.
 *
 * ## Fenced (backtick)
 *
 * Default fence style. Supports an optional info-string for the language.
 *
 * ```md
 * ```js
 * const x = 1;
 * ```
 * ```
 *
 * ## Fenced (tilde)
 *
 * Equivalent to backtick fences; useful when the code itself contains
 * backticks.
 *
 * ```md
 * ~~~js
 * const x = 1;
 * ~~~
 * ```
 *
 * ## Indented
 *
 * Each line of the code is indented by 4 spaces (or 1 tab). No info-string
 * is allowed.
 *
 * ```md
 *     const x = 1;
 * ```
 *
 * @param node   mdast Code node from remark-parse.
 * @param source The original markdown source, required to detect the
 *               original fence style via `node.position.start.offset`.
 * @return `core/code` block.
 */
export function toBlock( node: Code, source: string ): Block {
	const markdownData: { format: CodeFormat; language?: string } = {
		format: detectFormat( node, source ),
	};
	if ( node.lang ) {
		markdownData.language = node.lang;
	}
	return createBlock( 'core/code', {
		content: node.value,
		markdownData,
	} );
}

/**
 * Converts a `core/code` block back into an mdast Code node.
 *
 * The syntax is restored from `markdownData.format`: `fenced-tilde` emits a
 * tilde fence, otherwise a backtick fence is used.
 *
 * @param block `core/code` block.
 * @return mdast Code node together with serialization options.
 */
export function toNode( block: Block ): NodeResult< Code > {
	const { attributes } = block;
	const { content, markdownData } = attributes as BlockAttributes;
	const value =
		content instanceof RichTextData ? content.toPlainText() : content ?? '';
	return {
		node: {
			type: 'code',
			value,
			lang: markdownData?.language ?? null,
			meta: null,
		},
		options: {
			fence: markdownData?.format === 'fenced-tilde' ? '~' : '`',
		},
	};
}
