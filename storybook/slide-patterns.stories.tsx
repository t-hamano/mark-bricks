/**
 * External dependencies
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { browser } from '@marp-team/marp-core/browser';
import {
	defaultHighlightStyle,
	LanguageDescription,
	syntaxHighlighting,
} from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { Compartment, EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { useEditorTheme } from '@mark-bricks/editor/editor-theme-provider';
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
import { check, copy } from '@wordpress/icons';
import {
	Badge,
	IconButton,
	Link,
	SelectControl,
	Stack,
	Text,
} from '@wordpress/ui';

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
		root.innerHTML = `<style>:host { display: block; width: 100%; } div.marpit > svg { display: block; width: 100%; height: auto; }${ css }</style>${ html }`;
		// Scales auto-scaling elements, and lays out the slide in WebKit,
		// which cannot render HTML inside an SVG on its own. It must observe
		// the shadow root: an observer on the document would not reach it.
		const marpBrowser = browser( root );
		return () => marpBrowser.cleanup();
	}, [ html, css ] );

	return <div ref={ ref } />;
}

const MARKDOWN = LanguageDescription.matchLanguageName( languages, 'markdown' );

const lightHighlighting = syntaxHighlighting( defaultHighlightStyle, {
	fallback: true,
} );

/**
 * Shows Markdown in a read-only CodeMirror view, highlighted as the editor's
 * code blocks are.
 *
 * @param props       Component props.
 * @param props.value The Markdown to show.
 */
function MarkdownCode( { value }: { value: string } ) {
	const ref = useRef< HTMLDivElement >( null );
	const viewRef = useRef< EditorView | null >( null );
	const themeConf = useRef( new Compartment() );
	const languageConf = useRef( new Compartment() );
	const theme = useEditorTheme();
	const [ isCopied, setIsCopied ] = useState( false );

	useEffect( () => {
		const view = new EditorView( {
			parent: ref.current!,
			state: EditorState.create( {
				doc: value,
				extensions: [
					EditorState.readOnly.of( true ),
					EditorView.editable.of( false ),
					EditorView.lineWrapping,
					languageConf.current.of( [] ),
					themeConf.current.of( [] ),
					EditorView.theme( {
						'&': { height: '100%', fontSize: '12px' },
						'&, &.cm-focused': { background: 'transparent' },
						'.cm-content': { padding: '0 4px 12px' },
						'.cm-scroller': {
							fontFamily:
								'var( --wpds-typography-font-family-mono )',
						},
					} ),
				],
			} ),
		} );
		viewRef.current = view;
		MARKDOWN?.load().then( ( support ) =>
			view.dispatch( {
				effects: languageConf.current.reconfigure( support ),
			} )
		);
		return () => {
			view.destroy();
			viewRef.current = null;
		};
		// The view is created once; later values are synced below.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	useEffect( () => {
		const view = viewRef.current;
		if ( view && view.state.doc.toString() !== value ) {
			view.dispatch( {
				changes: { from: 0, to: view.state.doc.length, insert: value },
			} );
		}
	}, [ value ] );

	useEffect( () => {
		viewRef.current?.dispatch( {
			effects: themeConf.current.reconfigure(
				theme === 'dark' ? oneDark : lightHighlighting
			),
		} );
	}, [ theme ] );

	return (
		<div
			style={ {
				position: 'relative',
				flex: 1,
				minHeight: 0,
				display: 'flex',
				flexDirection: 'column',
				paddingTop: 48,
				borderRadius: 4,
				overflow: 'hidden',
				background:
					theme === 'dark'
						? '#282c34'
						: 'var( --wpds-color-background-surface-neutral-weak )',
			} }
		>
			<IconButton
				label={ isCopied ? 'Copied' : 'Copy' }
				icon={ isCopied ? check : copy }
				variant="minimal"
				size="compact"
				onClick={ () =>
					navigator.clipboard.writeText( value ).then( () => {
						setIsCopied( true );
						setTimeout( () => setIsCopied( false ), 2000 );
					} )
				}
				style={ { position: 'absolute', top: 8, right: 8 } }
			/>
			<div ref={ ref } style={ { flex: 1, minHeight: 0 } } />
		</div>
	);
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
	descriptionField: 'categories',
	fields: [],
	perPage: SLIDE_PATTERNS.length,
	layout: {
		aspectRatio: SLIDE_SIZES[ 0 ].aspectRatio,
		previewSize: PREVIEW_SIZES[ 0 ],
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
	const isMedium = useViewportMatch( 'medium', '<' );
	const markdownRef = useRef< HTMLElement >( null );
	const [ selectedName, setSelectedName ] = useState< string | null >( null );
	const selectedPattern = SLIDE_PATTERNS.find(
		( pattern ) => pattern.name === selectedName
	);
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
				render: ( { item } ) => (
					<Stack direction="row" wrap="wrap" gap="sm">
						{ item.categories.map( ( name ) => (
							<Badge key={ name }>
								{ SLIDE_PATTERN_CATEGORIES.find(
									( category ) => category.name === name
								)?.label() ?? name }
							</Badge>
						) ) }
					</Stack>
				),
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
		<div
			style={ {
				display: 'flex',
				flexDirection: isMedium ? 'column' : 'row',
				minHeight: '100vh',
				background:
					'var( --wpds-color-background-surface-neutral-strong )',
			} }
		>
			<div style={ { flex: 1, minWidth: 0 } }>
				<DataViews
					data={ data }
					fields={ fields }
					view={ view }
					onChangeView={ setView }
					paginationInfo={ paginationInfo }
					defaultLayouts={ { grid: {} } }
					getItemId={ ( item ) => item.name }
					isItemClickable={ () => true }
					onClickItem={ ( item ) => {
						setSelectedName( item.name );
						if ( isMedium ) {
							markdownRef.current?.scrollIntoView();
						}
					} }
				>
					<Text
						variant="body-md"
						render={ <p /> }
						style={ { margin: 0, padding: '24px 24px 8px' } }
					>
						These are the slide patterns that MarkBricks lets you
						insert when Marp mode is on. Each one is a ready-made
						slide for a{ ' ' }
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
											( item ) =>
												item.value === selectedCategory
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
															value: [
																item.value,
															],
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
									marks={ PREVIEW_SIZES.map(
										( _, index ) => ( {
											value: index,
										} )
									) }
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
												previewSize:
													PREVIEW_SIZES[ index ],
											},
										} as View )
									}
								/>
							</div>
						) }
					</Stack>
					<DataViews.Layout />
				</DataViews>
			</div>
			<aside
				ref={ markdownRef }
				aria-label="Markdown"
				style={ {
					boxSizing: 'border-box',
					width: isMedium ? '100%' : 480,
					flexShrink: 0,
					display: 'flex',
					flexDirection: 'column',
					gap: 16,
					padding: 24,
					...( isMedium
						? {
								borderTop:
									'1px solid var( --wpds-color-stroke-surface-neutral )',
							}
						: {
								position: 'sticky',
								top: 0,
								alignSelf: 'flex-start',
								height: '100vh',
								borderLeft:
									'1px solid var( --wpds-color-stroke-surface-neutral )',
							} ),
				} }
			>
				<Text
					variant="heading-lg"
					render={ <h2 /> }
					style={ { margin: 0 } }
				>
					{ selectedPattern ? selectedPattern.title() : 'Markdown' }
				</Text>
				{ selectedPattern ? (
					<>
						<div
							style={ {
								flexShrink: 0,
								border: '1px solid var( --wpds-color-stroke-surface-neutral-weak )',
								borderRadius: 4,
								overflow: 'hidden',
							} }
						>
							<SlidePatternPreview
								pattern={ selectedPattern }
								theme={ theme }
								size={ size }
							/>
						</div>
						<MarkdownCode
							value={ getSlidePatternMarkdown( selectedPattern ) }
						/>
					</>
				) : (
					<Text
						variant="body-md"
						render={ <p /> }
						style={ { margin: 0 } }
					>
						Click a pattern to show its Markdown here.
					</Text>
				) }
			</aside>
		</div>
	);
}

const meta: Meta< typeof SlidePatterns > = {
	component: SlidePatterns,
	title: 'Marp Slide Patterns',
};

export default meta;

export const Default: StoryObj< typeof SlidePatterns > = {};
