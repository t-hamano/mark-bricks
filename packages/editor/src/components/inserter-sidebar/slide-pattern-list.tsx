/**
 * External dependencies
 */
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type UIEventHandler,
} from 'react';

/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { Composite } from '@wordpress/components';
import { useRegistry } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { Button, SelectControl, Text, Tooltip } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import {
	SLIDE_PATTERN_CATEGORIES,
	SLIDE_PATTERNS,
	type SlidePattern,
	type SlidePatternCategory,
} from '../../marp-patterns';
import { getSlidePatternBlocks } from '../../marp-patterns/insert';
import {
	getSlidePatternPreview,
	getSlidePatternTheme,
	loadSlidePatternPreviews,
	type SlidePatternPreviews,
} from '../../marp-patterns/previews';
import { getFrontMatterValue } from '../../converter/front-matter';
import { useFrontMatter } from '../front-matter-editor/context';
import { SlidePatternPreview } from './slide-pattern-preview';
import {
	getInsertionTarget,
	useInsertionPointPreview,
} from './insertion-target';

// The value of the category filter that shows every pattern.
const ALL_CATEGORIES = 'all';

type CategoryFilter = SlidePatternCategory | typeof ALL_CATEGORIES;

type Props = {
	search: string;
	onScroll: UIEventHandler< HTMLDivElement >;
};

export function SlidePatternList( { search, onScroll }: Props ) {
	const registry = useRegistry();
	const { frontMatter } = useFrontMatter();
	const theme = getSlidePatternTheme(
		getFrontMatterValue( frontMatter, 'theme' )
	);
	const [ category, setCategory ] =
		useState< CategoryFilter >( ALL_CATEGORIES );
	// The cards show their titles until the previews have loaded. After that,
	// a card shows its preview, and its title in a tooltip.
	const [ previews, setPreviews ] = useState< SlidePatternPreviews | null >(
		null
	);

	useEffect( () => {
		let isMounted = true;
		loadSlidePatternPreviews().then( ( loaded ) => {
			if ( isMounted ) {
				setPreviews( loaded );
			}
		} );
		return () => {
			isMounted = false;
		};
	}, [] );

	const patterns = useMemo( () => {
		const q = search.trim().toLowerCase();
		const items = SLIDE_PATTERNS.filter(
			( pattern ) =>
				category === ALL_CATEGORIES ||
				pattern.categories.includes( category )
		).map( ( pattern ) => ( {
			pattern,
			title: pattern.title(),
			preview: previews
				? getSlidePatternPreview( previews, pattern, theme )
				: null,
		} ) );
		return q
			? items.filter( ( { title } ) => title.toLowerCase().includes( q ) )
			: items;
	}, [ search, category, previews, theme ] );

	const categoryItems = useMemo(
		() => [
			{
				value: ALL_CATEGORIES,
				label: __( 'All categories', 'mark-bricks' ),
			},
			...SLIDE_PATTERN_CATEGORIES.map( ( { name, label } ) => ( {
				value: name,
				label: label(),
			} ) ),
		],
		[]
	);

	const insertionPoint = useInsertionPointPreview();

	const insertPattern = useCallback(
		( pattern: SlidePattern ) => {
			const { getBlock, getBlockOrder } =
				registry.select( blockEditorStore );
			const { insertBlocks, replaceBlocks } =
				registry.dispatch( blockEditorStore );

			const order = getBlockOrder( '' );
			const at = ( i: number ) =>
				order[ i ]
					? ( getBlock( order[ i ] ) ?? undefined )
					: undefined;
			const { index, replaceClientId } = getInsertionTarget( registry );

			if ( replaceClientId ) {
				replaceBlocks(
					replaceClientId,
					getSlidePatternBlocks(
						pattern,
						at( index - 1 ),
						at( index + 1 )
					)
				);
			} else {
				insertBlocks(
					getSlidePatternBlocks(
						pattern,
						at( index - 1 ),
						at( index )
					),
					index,
					''
				);
			}
			insertionPoint.hide();
		},
		[ registry, insertionPoint ]
	);

	return (
		<Tooltip.Provider>
			<div className="inserter-sidebar__pattern-filter">
				<SelectControl
					label={ __( 'Category', 'mark-bricks' ) }
					hideLabelFromVision
					size="compact"
					items={ categoryItems }
					value={ categoryItems.find(
						( item ) => item.value === category
					) }
					onValueChange={ ( next ) => {
						if ( next?.value ) {
							setCategory( next.value as CategoryFilter );
						}
					} }
				/>
			</div>
			{ patterns.length === 0 && (
				<Text
					variant="body-sm"
					className="inserter-sidebar__pattern-empty"
				>
					{ __( 'No slide patterns found.', 'mark-bricks' ) }
				</Text>
			) }
			<Composite
				className="inserter-sidebar__pattern-list"
				role="listbox"
				aria-label={ __( 'Slide patterns', 'mark-bricks' ) }
				onScroll={ onScroll }
				focusLoop
				focusWrap
			>
				{ patterns.map( ( { pattern, title, preview } ) => (
					<Tooltip.Root key={ pattern.name } disabled={ ! preview }>
						<Composite.Item
							role="option"
							aria-label={ title }
							className="inserter-sidebar__pattern-list-item"
							onClick={ () => insertPattern( pattern ) }
							onMouseEnter={ insertionPoint.show }
							onMouseLeave={ insertionPoint.hide }
							onFocus={ insertionPoint.show }
							onBlur={ insertionPoint.hide }
							render={
								<Tooltip.Trigger
									render={
										<Button
											variant="outline"
											tone="neutral"
										/>
									}
								/>
							}
						>
							{ preview ? (
								<SlidePatternPreview
									html={ preview.html }
									css={ preview.css }
								/>
							) : (
								<Text
									variant="body-sm"
									className="inserter-sidebar__pattern-title"
								>
									{ title }
								</Text>
							) }
						</Composite.Item>
						<Tooltip.Popup>{ title }</Tooltip.Popup>
					</Tooltip.Root>
				) ) }
			</Composite>
		</Tooltip.Provider>
	);
}
