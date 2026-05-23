/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import {
	headingLevel1,
	headingLevel2,
	headingLevel3,
	headingLevel4,
	headingLevel5,
	headingLevel6,
} from '@wordpress/icons';
import type { BlockConfiguration, BlockVariation } from '@wordpress/blocks';
import * as heading from '@wordpress/block-library/build-module/heading/index.mjs';

/**
 * Internal dependencies
 */
import Edit from './edit';

export const { name, metadata } = heading;

const LEVEL_ICONS = [
	headingLevel1,
	headingLevel2,
	headingLevel3,
	headingLevel4,
	headingLevel5,
	headingLevel6,
];

export const settings: Partial< BlockConfiguration > = {
	...heading.settings,
	attributes: {
		...heading.metadata.attributes,
		markdownData: {
			type: 'object',
			default: {
				format: 'atx',
			},
		},
	},
	// Override core's variations: a getter rebuilds them at registration time
	// (after `applyLocale`) so titles localize, where core froze them in English
	// at module load. `isDefault` also drops the bare "Heading" inserter item.
	get variations(): BlockVariation[] {
		return [ 1, 2, 3, 4, 5, 6 ].map( ( level ) => ( {
			name: `h${ level }`,
			title: sprintf(
				/* translators: %d: heading level e.g: "1", "2", "3" */
				__( 'Heading %d' ),
				level
			),
			icon: LEVEL_ICONS[ level - 1 ],
			attributes: { level },
			isDefault: level === 2,
			scope: [ 'block', 'transform' ],
			keywords: [ `h${ level }` ],
			isActive: ( blockAttributes ) => blockAttributes.level === level,
		} ) );
	},
	edit: Edit as BlockConfiguration[ 'edit' ],
};
