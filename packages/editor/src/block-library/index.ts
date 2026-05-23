/**
 * WordPress dependencies
 */
import {
	registerBlockType,
	setDefaultBlockName,
	type BlockSupports,
} from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import * as paragraph from './paragraph';
import * as heading from './heading';
import * as list from './list';
import * as listItem from './list-item';
import * as code from './code';
import * as image from './image';
import * as table from './table';
import * as quote from './quote';
import * as separator from './separator';
import * as html from './html';

const blocks = [
	paragraph,
	heading,
	list,
	listItem,
	code,
	image,
	table,
	quote,
	separator,
	html,
];

export function registerBlocks() {
	blocks.forEach( ( block ) =>
		registerBlockType(
			{
				name: block.name,
				...block.metadata,
				supports: {
					...block.metadata.supports,
					// Disable settings menus that Markdown cannot represent
					// so unnecessary UI is not shown for these blocks.
					align: false,
					lock: false,
					visibility: false,
					color: false,
					typography: false,
				} as unknown as BlockSupports,
				// Drop core block style variations ; this app has no use
				// for them.
				styles: [],
			},
			block.settings
		)
	);
	setDefaultBlockName( paragraph.name );
}
