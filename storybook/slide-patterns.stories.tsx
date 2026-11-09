/**
 * External dependencies
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
	SLIDE_PATTERNS,
	SLIDE_PATTERN_THEMES,
	getSlidePatternMarkdown,
	type SlidePatternTheme,
} from '@mark-bricks/editor/marp-patterns';

/**
 * WordPress dependencies
 */
// `@wordpress/ui` has no toggle group yet.
/* eslint-disable @wordpress/no-unsafe-wp-apis */
import {
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
/* eslint-enable @wordpress/no-unsafe-wp-apis */

/**
 * Internal dependencies
 */
import { SlidePreview } from './slide-preview';

/**
 * Builds one deck of every slide pattern, in the order the inserter lists
 * them, in a built-in theme.
 *
 * @param theme The theme to show the patterns in.
 * @return Markdown of the deck.
 */
function getSlidePatternDeck( theme: SlidePatternTheme ): string {
	const slides = SLIDE_PATTERNS.map( getSlidePatternMarkdown );
	return `---\nmarp: true\ntheme: ${ theme }\n---\n\n${ slides.join(
		'\n\n---\n\n'
	) }\n`;
}

/**
 * Every slide pattern of the inserter, rendered as the app's slide preview
 * shows them, in the built-in theme chosen at the top.
 */
function SlidePatterns() {
	const [ theme, setTheme ] = useState< SlidePatternTheme >(
		SLIDE_PATTERN_THEMES[ 0 ]
	);
	return (
		<div
			style={ {
				display: 'flex',
				flexDirection: 'column',
				height: '100vh',
			} }
		>
			<div style={ { padding: '16px 16px 0' } }>
				<ToggleGroupControl
					__next40pxDefaultSize
					isBlock
					label="Theme"
					value={ theme }
					onChange={ ( value ) =>
						setTheme( value as SlidePatternTheme )
					}
				>
					{ SLIDE_PATTERN_THEMES.map( ( name ) => (
						<ToggleGroupControlOption
							key={ name }
							value={ name }
							label={ name }
						/>
					) ) }
				</ToggleGroupControl>
			</div>
			<div style={ { flex: 1, minHeight: 0 } }>
				<SlidePreview markdown={ getSlidePatternDeck( theme ) } />
			</div>
		</div>
	);
}

const meta: Meta< typeof SlidePatterns > = {
	component: SlidePatterns,
	title: 'Slide Patterns',
};

export default meta;

export const Default: StoryObj< typeof SlidePatterns > = {};
