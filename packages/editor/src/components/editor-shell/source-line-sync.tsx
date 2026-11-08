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
import {
	findBlockIndexAtLine,
	getBlockLineRanges,
	getSourceBlockLineRanges,
	type BlockLineRange,
} from '../../converter';

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

/**
 * Finds the lines that each top-level block takes up in the document as it
 * is written, which is what the host shows the slides of. The blocks match it
 * while they are the ones parsed from it, and again once the editor writes
 * out an edit. In between, while it holds another number of blocks, their
 * lines are counted in the document the editor writes of them instead.
 *
 * @param blocks      Top-level blocks of the document.
 * @param frontMatter Front matter content, or `null`.
 * @param content     The document as it is written.
 * @return The lines of each block, or `null` for a block that writes nothing.
 */
function findBlockLineRanges(
	blocks: Block[],
	frontMatter: string | null,
	content: string
): Array< BlockLineRange | null > {
	const ranges = getSourceBlockLineRanges( content );
	return ranges.length === blocks.length
		? ranges
		: getBlockLineRanges( blocks, frontMatter );
}

export type SourceLineSyncHandle = {
	selectLine: ( line: number ) => void;
};

type Props = {
	blocks: Block[];
	frontMatter: string | null;
	content: string;
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
 * @param props.content              The document as it is written.
 * @param props.enabled              Whether the block editor is shown.
 * @param props.onSelectedLineChange Called with the line, or `null` when no
 *                                   block is selected.
 * @param props.handleRef            Receives `selectLine`.
 */
export function SourceLineSync( {
	blocks,
	frontMatter,
	content,
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
		() =>
			tracksLines
				? findBlockLineRanges( blocks, frontMatter, content )
				: [],
		[ tracksLines, blocks, frontMatter, content ]
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

	const stateRef = useRef( { blocks, frontMatter, content, enabled } );
	stateRef.current = { blocks, frontMatter, content, enabled };

	useImperativeHandle(
		handleRef,
		() => ( {
			selectLine( target ) {
				const current = stateRef.current;
				if ( ! current.enabled ) {
					return;
				}
				const found = findBlockIndexAtLine(
					findBlockLineRanges(
						current.blocks,
						current.frontMatter,
						current.content
					),
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
