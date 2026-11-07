/**
 * WordPress dependencies
 */
import {
	createBlock,
	type BlockConfiguration,
	type BlockTransform,
} from '@wordpress/blocks';

const name = 'core/math';

type InputTransform = Omit< BlockTransform, 'type' > & {
	type: 'input';
	regExp: RegExp;
};

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
		} as InputTransform as unknown as BlockTransform,
	],
};

export default transforms;
