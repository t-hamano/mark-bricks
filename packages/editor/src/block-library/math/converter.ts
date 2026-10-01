/**
 * External dependencies
 */
import type { Code } from 'mdast';
import type { Math } from 'mdast-util-math';

/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { createBlock } from '../utils';
import type { NodeResult } from '../types';
import { MATH_LANGUAGE } from '../hooks/code-languages';
import type { BlockAttributes, MathFormat } from './types';

/**
 * Tells whether an mdast Code node is a math block written as a code fence.
 *
 * The language is matched exactly, so that a block saved back is written the
 * way it was read.
 *
 * @param node mdast Code node from remark-parse.
 * @return Whether the node is a ```` ```math ```` block.
 */
export function isMathCode( node: Code ): boolean {
	return node.lang === MATH_LANGUAGE;
}

/**
 * Converts an mdast Math node, or a Code node whose language is `math`, into
 * a `core/math` block.
 *
 * Both syntaxes GitHub renders as a display formula are read, and the
 * original one is kept for round-tripping.
 *
 * ## Dollar
 *
 * The syntax Marp, VS Code, and GitHub all render. A math block created in
 * the editor is written this way.
 *
 * ```md
 * $$
 * E = mc^2
 * $$
 * ```
 *
 * ## Fenced
 *
 * A code fence whose language is `math`, with backticks or tildes.
 *
 * ```md
 * ```math
 * E = mc^2
 * ```
 * ```
 *
 * @param node   mdast Math node, or a Code node for which `isMathCode` holds.
 * @param source The original markdown source, required to detect the
 *               original fence style via `node.position.start.offset`.
 * @return `core/math` block.
 */
export function toBlock( node: Code | Math, source: string ): Block {
	let format: MathFormat = 'dollar';
	if ( node.type === 'code' ) {
		const offset = node.position?.start.offset ?? 0;
		format = source[ offset ] === '~' ? 'fenced-tilde' : 'fenced-backtick';
	}
	const markdownData: BlockAttributes[ 'markdownData' ] = { format };
	if ( node.meta ) {
		markdownData.meta = node.meta;
	}
	return createBlock( 'core/math', { latex: node.value, markdownData } );
}

/**
 * Converts a `core/math` block back into an mdast Math or Code node.
 *
 * The syntax is restored from `markdownData.format`. A block without one,
 * such as a block pasted from WordPress, is written as `$$`.
 *
 * @param block `core/math` block.
 * @return mdast Math or Code node together with serialization options.
 */
export function toNode( block: Block ): NodeResult< Code | Math > {
	const { latex = '', markdownData } = block.attributes as BlockAttributes;
	const meta = markdownData?.meta ?? null;
	const format = markdownData?.format ?? 'dollar';
	if ( format === 'dollar' ) {
		// mdast-util-math writes the meta right after `$$`, while a code fence
		// gets a space after its language, so the space is added here.
		return {
			node: { type: 'math', value: latex, meta: meta && ` ${ meta }` },
		};
	}
	return {
		node: { type: 'code', value: latex, lang: MATH_LANGUAGE, meta },
		options: { fence: format === 'fenced-tilde' ? '~' : '`' },
	};
}
