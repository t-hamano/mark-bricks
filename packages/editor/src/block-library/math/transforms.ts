/**
 * WordPress dependencies
 */
import { createBlock, type BlockConfiguration } from '@wordpress/blocks';

const name = 'core/math';

/**
 * Typing `$$` in an empty paragraph starts a math block, as typing ```` ``` ````
 * starts a code block.
 */
const transforms: BlockConfiguration[ 'transforms' ] = {
	from: [
		{
			type: 'input',
			regExp: /^\$\$$/,
			transform: () => createBlock( name ),
		},
	],
};

export default transforms;
