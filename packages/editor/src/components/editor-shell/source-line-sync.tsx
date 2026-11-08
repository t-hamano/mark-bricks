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
import { useDispatch, useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { findBlockIndexAtLine, getBlockLineRanges } from '../../converter';

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
				if ( found !== -1 ) {
					selectBlock( current.blocks[ found ].clientId );
				}
			},
		} ),
		[ selectBlock ]
	);

	return null;
}
