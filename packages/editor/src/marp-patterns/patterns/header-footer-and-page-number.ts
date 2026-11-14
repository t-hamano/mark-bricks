/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { SlidePattern } from '../types';

const pattern: SlidePattern = {
	name: 'header-footer-and-page-number',
	title: () =>
		_x( 'Header, footer, and page number', 'slide pattern', 'mark-bricks' ),
	categories: [ 'text' ],
	markdown: `<!--
_header: "{{header}}"
_footer: "{{footer}}"
_paginate: true
-->

## {{heading}}

{{text}}`,
	strings: () => ( {
		header: _x(
			'Writing slides in Markdown',
			'slide pattern',
			'mark-bricks'
		),
		footer: _x( 'A short introduction', 'slide pattern', 'mark-bricks' ),
		heading: _x( 'Slides as plain text', 'slide pattern', 'mark-bricks' ),
		text: _x(
			'Write your slides as plain text and let the theme take care of the design.',
			'slide pattern',
			'mark-bricks'
		),
	} ),
};

export default pattern;
