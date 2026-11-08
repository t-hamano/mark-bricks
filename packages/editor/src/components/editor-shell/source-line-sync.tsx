/**
 * External dependencies
 */
import {
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	type Ref,
} from 'react';

/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import type { Block } from '@wordpress/blocks';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { findBlockIndexAtLine, getBlockLineRanges } from '../../converter';

/**
 * Finds the element of a block, in the page or in the canvas iframe.
 *
 * @param clientId Client ID of the block.
 * @return The element, or `null` when it is not rendered.
 */
function findBlockElement( clientId: string ): HTMLElement | null {
	const documents = [
		document,
		...Array.from(
			document.querySelectorAll( 'iframe' ),
			( frame ) => frame.contentDocument
		),
	];
	for ( const doc of documents ) {
		const element = doc?.getElementById( `block-${ clientId }` );
		if ( element ) {
			return element;
		}
	}
	return null;
}

export type SourceLineSyncHandle = {
	selectLine: ( line: number ) => void;
};

type Props = {
	blocks: Block[];
	frontMatter: string | null;
	enabled: boolean;
	onSelectedLineChange?: ( line: number | null ) => void;
	handleRef: Ref< SourceLineSyncHandle >;
};

/**
 * Links the selected block to the lines of the document: reports the line
 * the selected top-level block starts at whenever it changes, and selects the
 * block of a line on request. Selecting a block scrolls it into view.
 *
 * Rendered inside `BlockEditorProvider`, whose registry holds the selection.
 *
 * @param props                      Component props.
 * @param props.blocks               Top-level blocks of the document.
 * @param props.frontMatter          Front matter content, or `null`.
 * @param props.enabled              Whether the block editor is shown.
 * @param props.onSelectedLineChange Called with the line, or `null` when no
 *                                   block is selected.
 * @param props.handleRef            Receives `selectLine`.
 */
export function SourceLineSync( {
	blocks,
	frontMatter,
	enabled,
	onSelectedLineChange,
	handleRef,
}: Props ) {
	const rootClientId = useSelect( ( select ) => {
		const { getBlockSelectionStart, getBlockHierarchyRootClientId } =
			select( blockEditorStore );
		const clientId = getBlockSelectionStart();
		return clientId ? getBlockHierarchyRootClientId( clientId ) : null;
	}, [] );
	const { selectBlock } = useDispatch( blockEditorStore );
	const registry = useRegistry();

	// Only worked out for a host that follows the selection.
	const tracksLines = !! onSelectedLineChange && enabled;
	const ranges = useMemo(
		() => ( tracksLines ? getBlockLineRanges( blocks, frontMatter ) : [] ),
		[ tracksLines, blocks, frontMatter ]
	);
	const index = rootClientId
		? blocks.findIndex( ( block ) => block.clientId === rootClientId )
		: -1;
	const line = ranges[ index ]?.start ?? null;

	const onSelectedLineChangeRef = useRef( onSelectedLineChange );
	onSelectedLineChangeRef.current = onSelectedLineChange;
	const reportedRef = useRef< number | null >( null );

	useEffect( () => {
		if ( line !== reportedRef.current ) {
			reportedRef.current = line;
			onSelectedLineChangeRef.current?.( line );
		}
	}, [ line ] );

	const stateRef = useRef( { blocks, frontMatter, enabled } );
	stateRef.current = { blocks, frontMatter, enabled };

	useImperativeHandle(
		handleRef,
		() => ( {
			selectLine( target ) {
				const current = stateRef.current;
				if ( ! current.enabled ) {
					return;
				}
				const found = findBlockIndexAtLine(
					getBlockLineRanges( current.blocks, current.frontMatter ),
					target
				);
				if ( found === -1 ) {
					return;
				}
				const { clientId } = current.blocks[ found ];
				// The block editor scrolls a block into view only as it gets
				// selected, so a block already selected is scrolled here.
				if (
					registry
						.select( blockEditorStore )
						.getSelectedBlockClientId() === clientId
				) {
					findBlockElement( clientId )?.scrollIntoView( {
						block: 'nearest',
					} );
				} else {
					selectBlock( clientId );
				}
			},
		} ),
		[ registry, selectBlock ]
	);

	return null;
}
