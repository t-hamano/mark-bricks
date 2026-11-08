/**
 * External dependencies
 */
import { useEffect } from 'react';

/**
 * WordPress dependencies
 */
import { store as blocksStore } from '@wordpress/blocks';
import { useRegistry } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

// Not imported from `./index`, which would load the block module before the
// host applies the locale.
const name = 'core/separator';

/**
 * Renames the separator block to "Slide Separator" while the document is a
 * Marp slide deck, where a separator starts a new slide. The registered title
 * is put back when Marp is turned off or the editor unmounts.
 *
 * @param isMarp Whether the document is a Marp slide deck.
 */
export function useMarpSeparatorTitle( isMarp: boolean ) {
	const registry = useRegistry();
	useEffect( () => {
		if ( ! isMarp ) {
			return;
		}
		const { getBlockType } = registry.select( blocksStore );
		const blockType = getBlockType( name );
		if ( ! blockType ) {
			return;
		}
		const { addBlockTypes } = registry.dispatch( blocksStore );
		const { title } = blockType;
		addBlockTypes( {
			...blockType,
			title: __( 'Slide Separator', 'mark-bricks' ),
		} );
		return () => {
			const current = getBlockType( name );
			if ( current ) {
				addBlockTypes( { ...current, title } );
			}
		};
	}, [ isMarp, registry ] );
}
