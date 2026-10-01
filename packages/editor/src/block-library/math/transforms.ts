/**
 * WordPress dependencies
 */
import {
	createBlock,
	type BlockConfiguration,
	type BlockTransform,
} from '@wordpress/blocks';
import { RichTextData } from '@wordpress/rich-text';

/**
 * Internal dependencies
 */
import type { BlockAttributes as CodeBlockAttributes } from '../code/types';
import type { BlockAttributes } from './types';

const name = 'core/math';

type InputTransform = Omit< BlockTransform, 'type' > & {
	type: 'input';
	regExp: RegExp;
};

/**
 * Typing `$$` in an empty paragraph starts a math block, as typing ```` ``` ````
 * starts a code block. A math block can also turn into a code block and back,
 * keeping its source.
 */
const transforms: BlockConfiguration[ 'transforms' ] = {
	from: [
		{
			type: 'input',
			regExp: /^\$\$$/,
			transform: () => createBlock( name ),
		} as InputTransform as unknown as BlockTransform,
		{
			type: 'block',
			blocks: [ 'core/code' ],
			transform: ( attributes ) => {
				const { content } = attributes as CodeBlockAttributes;
				return createBlock( name, {
					latex:
						content instanceof RichTextData
							? content.toPlainText()
							: ( content ?? '' ),
				} );
			},
		},
	],
	to: [
		{
			type: 'block',
			blocks: [ 'core/code' ],
			transform: ( attributes ) => {
				const { latex = '' } = attributes as BlockAttributes;
				return createBlock( 'core/code', {
					content: RichTextData.fromPlainText( latex ),
				} );
			},
		},
	],
};

export default transforms;
