/**
 * WordPress dependencies
 */
import {
	createBlock,
	getDefaultBlockName,
	type BlockConfiguration,
	type BlockTransform,
} from '@wordpress/blocks';
import * as separator from '@wordpress/block-library/build-module/separator/index.mjs';

/**
 * Internal dependencies
 */
import type { SeparatorMarker } from './types';

const { name } = separator;

type InputTransform = Omit< BlockTransform, 'type' > & {
	type: 'input';
	regExp: RegExp;
};

const INPUT_PATTERNS: { regExp: RegExp; marker: SeparatorMarker }[] = [
	{ regExp: /^\*{3,}$/, marker: '*' },
	{ regExp: /^_{3,}$/, marker: '_' },
];

/**
 * Core handles `---`; this adds the other Markdown delimiters `***` and `___`.
 */
const transforms: BlockConfiguration[ 'transforms' ] = {
	...separator.settings.transforms,
	from: [
		...( separator.settings.transforms?.from ?? [] ),
		...( INPUT_PATTERNS.map< InputTransform >( ( { regExp, marker } ) => ( {
			type: 'input',
			regExp,
			transform: () => [
				createBlock( name, {
					markdownData: {
						format: { marker, repetition: 3, spaces: false },
					},
				} ),
				createBlock( getDefaultBlockName() as string ),
			],
		} ) ) as unknown as BlockTransform[] ),
	],
};

export default transforms;
