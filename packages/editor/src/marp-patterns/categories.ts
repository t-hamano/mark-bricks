/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePatternCategory } from './types';

/**
 * The groups of slide patterns, in the order the inserter lists them.
 */
export const SLIDE_PATTERN_CATEGORIES: readonly {
	name: SlidePatternCategory;
	label: () => string;
}[] = [
	{
		name: 'title',
		label: () => _x( 'Title', 'slide pattern category', 'mark-bricks' ),
	},
	{
		name: 'text',
		label: () => _x( 'Text', 'slide pattern category', 'mark-bricks' ),
	},
	{
		name: 'image',
		label: () => _x( 'Image', 'slide pattern category', 'mark-bricks' ),
	},
];
