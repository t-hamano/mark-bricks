/**
 * External dependencies
 */
import { useCallback, useMemo, type UIEventHandler } from 'react';

/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { Composite } from '@wordpress/components';
import { useRegistry } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { Button, Text } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { SLIDE_PATTERNS, type SlidePattern } from '../../marp-patterns';
import { getSlidePatternBlocks } from '../../marp-patterns/insert';
import {
	getInsertionTarget,
	useInsertionPointPreview,
} from './insertion-target';

type Props = {
	search: string;
	onScroll: UIEventHandler< HTMLDivElement >;
};

export function SlidePatternList( { search, onScroll }: Props ) {
	const registry = useRegistry();

	const patterns = useMemo( () => {
		const q = search.trim().toLowerCase();
		const items = SLIDE_PATTERNS.map( ( pattern ) => ( {
			pattern,
			title: pattern.title(),
		} ) );
		return q
			? items.filter( ( { title } ) => title.toLowerCase().includes( q ) )
			: items;
	}, [ search ] );

	const preview = useInsertionPointPreview();

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
			preview.hide();
		},
		[ registry, preview ]
	);

	return (
		<Composite
			className="inserter-sidebar__pattern-list"
			role="listbox"
			aria-label={ __( 'Slide patterns', 'mark-bricks' ) }
			onScroll={ onScroll }
			focusLoop
			focusWrap
		>
			{ patterns.map( ( { pattern, title } ) => (
				<Composite.Item
					key={ pattern.name }
					role="option"
					className="inserter-sidebar__pattern-list-item"
					onClick={ () => insertPattern( pattern ) }
					onMouseEnter={ preview.show }
					onMouseLeave={ preview.hide }
					onFocus={ preview.show }
					onBlur={ preview.hide }
					render={ <Button variant="outline" tone="neutral" /> }
				>
					<Text variant="body-sm">{ title }</Text>
				</Composite.Item>
			) ) }
		</Composite>
	);
}
