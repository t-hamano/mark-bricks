/**
 * External dependencies
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { browser } from '@marp-team/marp-core/browser';
import {
	SLIDE_PATTERNS,
	SLIDE_PATTERN_CATEGORIES,
	SLIDE_PATTERN_THEMES,
	getSlidePatternMarkdown,
	type SlidePattern,
	type SlidePatternTheme,
} from '@mark-bricks/editor/marp-patterns';
import { renderSlides } from '@mark-bricks/marp-preview/render';
// The web fonts of the built-in Gaia theme.
import '@fontsource/lato/400.css';
import '@fontsource/lato/900.css';

/**
 * WordPress dependencies
 */
// `@wordpress/ui` has no toggle group yet.
import {
	RangeControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { useViewportMatch } from '@wordpress/compose';
import {
	DataViews,
	filterSortAndPaginate,
	type Field,
	type View,
} from '@wordpress/dataviews';
import '@wordpress/dataviews/build-style/style.css';
import { Link, SelectControl, Stack, Text } from '@wordpress/ui';

// Fits the slide to the card. The slide is an SVG, so it scales with its
// width.
const PREVIEW_STYLE = `
:host { display: block; width: 100%; }
div.marpit > svg { display: block; width: 100%; height: auto; }
`;

// The slide sizes that every built-in theme offers, and the grid's aspect
// ratio for each.
const SLIDE_SIZES = [
	{ size: '16:9', aspectRatio: '16/9' },
	{ size: '4:3', aspectRatio: '4/3' },
] as const;

type SlideSize = ( typeof SLIDE_SIZES )[ number ][ 'size' ];

type SlidePatternPreviewProps = {
	pattern: SlidePattern;
	theme: SlidePatternTheme;
	size: SlideSize;
};

/**
 * Renders a pattern's slide in a built-in theme, as the app's slide preview
 * does.
 *
 * It renders in a shadow root, so the theme's stylesheet and the page's styles
 * leave each other alone.
 *
 * @param props         Component props.
 * @param props.pattern The pattern to show.
 * @param props.theme   The theme to show it in.
 * @param props.size    The slide size to show it at.
 */
function SlidePatternPreview( {
	pattern,
	theme,
	size,
}: SlidePatternPreviewProps ) {
	const ref = useRef< HTMLDivElement >( null );
	const { html, css } = useMemo(
		() =>
			renderSlides(
				`---\nmarp: true\ntheme: ${ theme }\nsize: ${ size }\n---\n\n${ getSlidePatternMarkdown(
					pattern
				) }\n`
			),
		[ pattern, theme, size ]
	);

	useLayoutEffect( () => {
		const host = ref.current;
		if ( ! host ) {
			return;
		}
		const root = host.shadowRoot ?? host.attachShadow( { mode: 'open' } );
		root.innerHTML = `<style>${ PREVIEW_STYLE }${ css }</style>${ html }`;
		// Scales auto-scaling elements, and lays out the slide in WebKit,
		// which cannot render HTML inside an SVG on its own. It must observe
		// the shadow root: an observer on the document would not reach it.
		const marpBrowser = browser( root );
		return () => marpBrowser.cleanup();
	}, [ html, css ] );

	return <div ref={ ref } />;
}

// The widths of the previews that the size control offers, in pixels. The
// smallest that DataViews' own control offers are too small to read a slide
// at.
const PREVIEW_SIZES = [ 230, 290, 350, 430 ];

// The options of the category select, all of them first.
const CATEGORY_ITEMS = [
	{ label: 'All categories', value: null },
	...SLIDE_PATTERN_CATEGORIES.map( ( { name, label } ) => ( {
		label: label(),
		value: name,
	} ) ),
];

const DEFAULT_VIEW: View = {
	type: 'grid',
	titleField: 'title',
	mediaField: 'preview',
	fields: [ 'categories' ],
	perPage: SLIDE_PATTERNS.length,
	layout: {
		aspectRatio: SLIDE_SIZES[ 0 ].aspectRatio,
		previewSize: PREVIEW_SIZES[ 0 ],
		badgeFields: [ 'categories' ],
	},
};

/**
 * Every slide pattern of the inserter in a grid, rendered in the built-in
 * theme chosen at the top. The patterns can be filtered by category.
 */
function SlidePatterns() {
	const [ theme, setTheme ] = useState< SlidePatternTheme >(
		SLIDE_PATTERN_THEMES[ 0 ]
	);
	const [ view, setView ] = useState< View >( DEFAULT_VIEW );
	const isSmall = useViewportMatch( 'small', '<' );
	const selectedCategory: string | null =
		view.filters?.find( ( filter ) => filter.field === 'categories' )
			?.value?.[ 0 ] ?? null;
	const previewSize =
		view.type === 'grid' ? view.layout?.previewSize : undefined;
	const size =
		SLIDE_SIZES.find(
			( item ) =>
				view.type === 'grid' &&
				item.aspectRatio === view.layout?.aspectRatio
		)?.size ?? SLIDE_SIZES[ 0 ].size;

	const fields = useMemo< Field< SlidePattern >[] >(
		() => [
			{
				id: 'preview',
				label: 'Preview',
				render: ( { item } ) => (
					<SlidePatternPreview
						pattern={ item }
						theme={ theme }
						size={ size }
					/>
				),
				enableSorting: false,
				enableHiding: false,
			},
			{
				id: 'title',
				label: 'Title',
				type: 'text',
				getValue: ( { item } ) => item.title(),
				enableHiding: false,
				filterBy: false,
			},
			{
				id: 'categories',
				label: 'Categories',
				type: 'array',
				getValue: ( { item } ) => [ ...item.categories ],
				render: ( { item } ) =>
					item.categories
						.map(
							( name ) =>
								SLIDE_PATTERN_CATEGORIES.find(
									( category ) => category.name === name
								)?.label() ?? name
						)
						.join( ', ' ),
				elements: SLIDE_PATTERN_CATEGORIES.map(
					( { name, label } ) => ( { value: name, label: label() } )
				),
				filterBy: { operators: [ 'isAny' ] },
				enableSorting: false,
			},
		],
		[ theme, size ]
	);

	const { data, paginationInfo } = useMemo(
		() => filterSortAndPaginate( [ ...SLIDE_PATTERNS ], view, fields ),
		[ view, fields ]
	);

	return (
		<DataViews
			data={ data }
			fields={ fields }
			view={ view }
			onChangeView={ setView }
			paginationInfo={ paginationInfo }
			defaultLayouts={ { grid: {} } }
			getItemId={ ( item ) => item.name }
		>
			<Text
				variant="body-md"
				render={ <p /> }
				style={ { margin: 0, padding: '24px 24px 8px' } }
			>
				These are the slide patterns that MarkBricks lets you insert
				when Marp mode is on. Each one is a ready-made slide for a{ ' ' }
				<Link href="https://marp.app/" openInNewTab>
					Marp
				</Link>{ ' ' }
				deck, shown here in the built-in theme chosen below.
			</Text>
			<Stack
				direction="row"
				align="end"
				justify="space-between"
				wrap="wrap"
				gap="md"
				className="dataviews__view-actions"
				style={ { top: 0, zIndex: 1, paddingTop: 8 } }
			>
				<Stack direction="row" align="end" wrap="wrap" gap="lg">
					<div style={ { width: 200 } }>
						<SelectControl
							label="Category"
							items={ CATEGORY_ITEMS }
							value={
								CATEGORY_ITEMS.find(
									( item ) => item.value === selectedCategory
								) ?? CATEGORY_ITEMS[ 0 ]
							}
							onValueChange={ ( item ) =>
								setView( {
									...view,
									filters: item?.value
										? [
												{
													field: 'categories',
													operator: 'isAny',
													value: [ item.value ],
												},
											]
										: [],
								} )
							}
						/>
					</div>
					<ToggleGroupControl
						__next40pxDefaultSize
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
					<ToggleGroupControl
						__next40pxDefaultSize
						label="Aspect ratio"
						value={ size }
						onChange={ ( value ) =>
							setView( {
								...view,
								layout: {
									...view.layout,
									aspectRatio: SLIDE_SIZES.find(
										( item ) => item.size === value
									)?.aspectRatio,
								},
							} as View )
						}
					>
						{ SLIDE_SIZES.map( ( item ) => (
							<ToggleGroupControlOption
								key={ item.size }
								value={ item.size }
								label={ item.size }
							/>
						) ) }
					</ToggleGroupControl>
				</Stack>
				{ ! isSmall && (
					<div style={ { width: 160 } }>
						<RangeControl
							__next40pxDefaultSize
							label="Preview size"
							showTooltip={ false }
							withInputField={ false }
							min={ 0 }
							max={ PREVIEW_SIZES.length - 1 }
							step={ 1 }
							marks={ PREVIEW_SIZES.map( ( _, index ) => ( {
								value: index,
							} ) ) }
							value={ Math.max(
								0,
								PREVIEW_SIZES.indexOf(
									previewSize ?? PREVIEW_SIZES[ 0 ]
								)
							) }
							onChange={ ( index = 0 ) =>
								setView( {
									...view,
									layout: {
										...view.layout,
										previewSize: PREVIEW_SIZES[ index ],
									},
								} as View )
							}
						/>
					</div>
				) }
			</Stack>
			<DataViews.Layout />
		</DataViews>
	);
}

const meta: Meta< typeof SlidePatterns > = {
	component: SlidePatterns,
	title: 'Marp Slide Patterns',
};

export default meta;

export const Default: StoryObj< typeof SlidePatterns > = {};
