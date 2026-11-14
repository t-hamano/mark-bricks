/**
 * External dependencies
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useRegistry } from '@wordpress/data';

/**
 * Internal dependencies
 */
import {
	SLIDE_PATTERNS,
	type SlidePattern,
	type SlidePatternCategory,
} from '../marp-patterns';
import { getSlidePatternBlocks } from '../marp-patterns/insert';
import {
	getSlidePatternPreview,
	getSlidePatternTheme,
	loadSlidePatternPreviews,
	type SlidePatternPreviews,
} from '../marp-patterns/previews';
import { getFrontMatterValue } from '../converter/front-matter';
import { useFrontMatter } from '../components/front-matter-editor/context';
import { getInsertionTarget } from './insertion-target';

// The category that shows every pattern.
export const ALL_CATEGORIES = 'all';

export type CategoryFilter = SlidePatternCategory | typeof ALL_CATEGORIES;

/**
 * Loads the pattern previews. It is null until they have loaded.
 */
export function useSlidePatternPreviews() {
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

	return previews;
}

/**
 * The patterns in a category whose titles match the search, each with its
 * title and its preview in the deck's theme.
 *
 * @param search   Search text.
 * @param category Category to show.
 * @param previews Loaded previews, or null while they load.
 */
export function useSlidePatternItems(
	search: string,
	category: CategoryFilter,
	previews: SlidePatternPreviews | null
) {
	const { frontMatter } = useFrontMatter();
	const theme = getSlidePatternTheme(
		getFrontMatterValue( frontMatter, 'theme' )
	);

	return useMemo( () => {
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
}

/**
 * Returns a function that inserts a pattern where the inserter puts new
 * blocks.
 */
export function useInsertSlidePattern() {
	const registry = useRegistry();

	return useCallback(
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
		},
		[ registry ]
	);
}
