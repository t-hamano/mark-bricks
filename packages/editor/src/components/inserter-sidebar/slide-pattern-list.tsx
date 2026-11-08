/**
 * External dependencies
 */
import { useCallback, useMemo, type UIEventHandler } from 'react';

/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { isUnmodifiedDefaultBlock } from '@wordpress/blocks';
import { Composite } from '@wordpress/components';
import { useRegistry } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { Button, Text } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { SLIDE_PATTERNS, type SlidePattern } from '../../marp-patterns';
import { getSlidePatternBlocks } from '../../marp-patterns/insert';

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

	// Inserts the pattern after the top-level block that holds the selection,
	// or at the end of the document. An empty paragraph there is replaced.
	const insertPattern = useCallback(
		( pattern: SlidePattern ) => {
			const {
				getBlock,
				getBlockOrder,
				getBlockHierarchyRootClientId,
				getSelectedBlockClientId,
			} = registry.select( blockEditorStore );
			const { insertBlocks, replaceBlocks } =
				registry.dispatch( blockEditorStore );

			const order = getBlockOrder( '' );
			const selected = getSelectedBlockClientId();
			const root = selected
				? getBlockHierarchyRootClientId( selected )
				: undefined;
			const rootIndex = root ? order.indexOf( root ) : -1;
			const rootBlock = root ? getBlock( root ) : null;
			const at = ( index: number ) =>
				order[ index ]
					? ( getBlock( order[ index ] ) ?? undefined )
					: undefined;

			if ( rootBlock && isUnmodifiedDefaultBlock( rootBlock ) ) {
				replaceBlocks(
					rootBlock.clientId,
					getSlidePatternBlocks(
						pattern,
						at( rootIndex - 1 ),
						at( rootIndex + 1 )
					)
				);
				return;
			}

			const index = rootIndex === -1 ? order.length : rootIndex + 1;
			insertBlocks(
				getSlidePatternBlocks( pattern, at( index - 1 ), at( index ) ),
				index,
				''
			);
		},
		[ registry ]
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
					render={ <Button variant="outline" tone="neutral" /> }
				>
					<Text variant="body-sm">{ title }</Text>
				</Composite.Item>
			) ) }
		</Composite>
	);
}
