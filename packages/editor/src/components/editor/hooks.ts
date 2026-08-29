/**
 * External dependencies
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * WordPress dependencies
 */
import {
	createBlock,
	isUnmodifiedDefaultBlock,
	type Block,
} from '@wordpress/blocks';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useDebounce, useRefEffect } from '@wordpress/compose';
import { useDispatch, useRegistry } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { blocksToMarkdown, markdownToBlocks } from '../../converter';
import { store as editorStore } from '../../store';

interface History {
	past: Block[][];
	present: Block[];
	future: Block[][];
}

const createInitialHistory = ( content: string ): History => {
	const blocks = markdownToBlocks( content );
	return {
		past: [],
		present:
			blocks.length > 0 ? blocks : [ createBlock( 'core/paragraph' ) ],
		future: [],
	};
};

type UseMarkdownDocumentArgs = {
	content: string;
	onChange: ( content: string ) => void;
	isVisualMode: boolean;
};

type MarkdownDocument = {
	blocks: Block[];
	onBlocksChange: ( next: Block[] ) => void;
	onInput: ( next: Block[] ) => void;
	undo: () => void;
	redo: () => void;
	canUndo: boolean;
	canRedo: boolean;
	flush: () => void;
};

/**
 * Bridges the markdown `content` prop and the Gutenberg block tree.
 *
 * - Initializes and maintains an undo/redo history of blocks.
 * - Converts block edits back into markdown and reports them via onChange.
 * - Applies external content changes (text mode edits, document loads)
 *   to the block tree.
 *
 * @param root0
 * @param root0.content
 * @param root0.onChange
 * @param root0.isVisualMode
 */
export function useMarkdownDocument( {
	content,
	onChange,
	isVisualMode,
}: UseMarkdownDocumentArgs ): MarkdownDocument {
	const [ history, setHistory ] = useState< History >( () =>
		createInitialHistory( content )
	);

	const onChangeRef = useRef( onChange );
	onChangeRef.current = onChange;
	const contentRef = useRef( content );
	contentRef.current = content;

	// Last markdown value this editor emitted through onChange. The
	// matching content prop update is ignored so it is not converted
	// straight back into blocks, which would discard the selection.
	const lastEmittedRef = useRef( content );

	const emitMarkdown = useCallback( ( blocks: Block[] ) => {
		const markdown = blocksToMarkdown( blocks );
		if ( markdown === contentRef.current ) {
			return;
		}
		lastEmittedRef.current = markdown;
		onChangeRef.current( markdown );
	}, [] );

	const debouncedEmitMarkdown = useDebounce( emitMarkdown, 500 );

	// The block tree as first loaded from `content`. While present still
	// equals it (and nothing was edited), skip emitting. Reference
	// comparison instead of a one-shot flag stays correct under StrictMode,
	// whose double-invoked mount effect would otherwise emit and dirty a
	// freshly opened file.
	const initialPresentRef = useRef( history.present );
	const hasUserEditedRef = useRef( false );

	// Convert block edits back into markdown and report them upstream.
	// Runs for any block change (typing, structural edits, undo/redo)
	// because they all flow through history.present.
	useEffect( () => {
		if (
			! hasUserEditedRef.current &&
			history.present === initialPresentRef.current
		) {
			return;
		}
		// Latch so undo back to the initial tree still emits.
		hasUserEditedRef.current = true;
		if ( ! isVisualMode ) {
			return;
		}
		debouncedEmitMarkdown( history.present );
	}, [ history.present, isVisualMode, debouncedEmitMarkdown ] );

	// Apply external content changes (text mode edits, document loads)
	// to the block tree.
	useEffect( () => {
		if ( content === lastEmittedRef.current ) {
			return;
		}
		const blocks = markdownToBlocks( content );
		setHistory( ( h ) => ( {
			past: [ ...h.past, h.present ],
			present:
				blocks.length > 0
					? blocks
					: [ createBlock( 'core/paragraph' ) ],
			future: [],
		} ) );
	}, [ content ] );

	const onBlocksChange = useCallback( ( next: Block[] ) => {
		setHistory( ( h ) => {
			if ( next === h.present ) {
				return h;
			}
			return {
				past: [ ...h.past, h.present ],
				present: next,
				future: [],
			};
		} );
	}, [] );

	const onInput = useCallback( ( next: Block[] ) => {
		setHistory( ( h ) => {
			if ( next === h.present ) {
				return h;
			}
			return { ...h, present: next };
		} );
	}, [] );

	const undo = useCallback( () => {
		setHistory( ( h ) => {
			if ( h.past.length === 0 ) {
				return h;
			}
			const previous = h.past[ h.past.length - 1 ];
			return {
				past: h.past.slice( 0, -1 ),
				present: previous,
				future: [ h.present, ...h.future ],
			};
		} );
	}, [] );

	const redo = useCallback( () => {
		setHistory( ( h ) => {
			if ( h.future.length === 0 ) {
				return h;
			}
			const [ next, ...rest ] = h.future;
			return {
				past: [ ...h.past, h.present ],
				present: next,
				future: rest,
			};
		} );
	}, [] );

	// Drains the debounce so a caller that is about to read the markdown
	// (a save, a dirty check) sees the latest keystrokes instead of the
	// value from up to the debounce window ago.
	const flush = useCallback( () => {
		debouncedEmitMarkdown.flush();
	}, [ debouncedEmitMarkdown ] );

	return {
		blocks: history.present,
		onBlocksChange,
		onInput,
		undo,
		redo,
		canUndo: history.past.length > 0,
		canRedo: history.future.length > 0,
		flush,
	};
}

/**
 * Keeps the block canvas iframe body `spellcheck` attribute in sync.
 * The `spellcheck` HTML attribute is inherited, so applying it to the
 * iframe body propagates to all contenteditable descendants.
 *
 * @param spellCheck
 */
export function useCanvasSpellCheck( spellCheck: boolean ) {
	return useRefEffect< HTMLElement >(
		( node ) => {
			node.spellcheck = spellCheck;
		},
		[ spellCheck ]
	);
}

/**
 * Opens the list view sidebar on mount when requested. The initial value
 * is captured once so later prop changes do not reopen it.
 *
 * @param showByDefault
 */
export function useInitialListView( showByDefault: boolean ): void {
	const [ initialShowListView ] = useState( () => showByDefault );
	const { setIsListViewOpened } = useDispatch( editorStore );

	useEffect( () => {
		setIsListViewOpened( initialShowListView );
	}, [ setIsListViewOpened, initialShowListView ] );
}

/**
 * Appends a trailing default block when the user clicks the empty padding
 * area below the last block. This mirrors `usePaddingAppender` from
 * the WordPress `@wordpress/editor` package.
 *
 * @param enabled
 */
export function usePaddingAppender( enabled: boolean ) {
	const registry = useRegistry();
	return useRefEffect< HTMLElement >(
		( node ) => {
			if ( ! enabled ) {
				return;
			}

			function onMouseDown( event: MouseEvent ) {
				if (
					event.target !== node &&
					event.target !== node.parentElement
				) {
					return;
				}
				const lastChild = node.lastElementChild;

				if ( ! lastChild ) {
					return;
				}
				if (
					event.clientY < lastChild.getBoundingClientRect().bottom
				) {
					return;
				}

				event.preventDefault();

				const { getBlockOrder, getBlock } =
					registry.select( blockEditorStore );
				const { selectBlock, insertDefaultBlock } =
					registry.dispatch( blockEditorStore );
				const blockOrder = getBlockOrder( '' );
				const lastBlockClientId = blockOrder[ blockOrder.length - 1 ];
				const lastBlock = lastBlockClientId
					? getBlock( lastBlockClientId )
					: undefined;

				if ( lastBlock && isUnmodifiedDefaultBlock( lastBlock ) ) {
					selectBlock( lastBlockClientId );
				} else {
					insertDefaultBlock();
				}
			}

			node.addEventListener( 'mousedown', onMouseDown );
			return () => {
				node.removeEventListener( 'mousedown', onMouseDown );
			};
		},
		[ enabled, registry ]
	);
}
