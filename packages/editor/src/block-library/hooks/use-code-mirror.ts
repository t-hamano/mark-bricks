/**
 * External dependencies
 */
import {
	defaultKeymap,
	history,
	historyKeymap,
	indentWithTab,
} from '@codemirror/commands';
import {
	defaultHighlightStyle,
	LanguageDescription,
	syntaxHighlighting,
} from '@codemirror/language';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { useEffect, useRef, useState } from 'react';

/**
 * WordPress dependencies
 */
import { createBlock, getDefaultBlockName } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import type { BlockEditProps } from '../types';
import { CODE_LANGUAGES } from './code-languages';

type Props = {
	text: string;
	language: string;
	placeholder?: string;
	handlers: {
		previousBlockClientId: string | null;
		nextBlockClientId: string | null;
		insertBlocksAfter: BlockEditProps[ 'insertBlocksAfter' ];
		selectBlock: ( clientId: string, initialPosition?: number ) => void;
		onChange: ( text: string ) => void;
	};
};

/**
 * Manages the CodeMirror editor lifecycle for code-like blocks: creates the
 * instance on mount, syncs external content changes, and loads syntax
 * highlighting for the current language.
 *
 * @param props             The hook props.
 * @param props.text        The plain-text document content.
 * @param props.language    The language name to highlight.
 * @param props.placeholder The text shown while the document is empty.
 * @param props.handlers    Editor callbacks read fresh on each keypress.
 * @return The ref callback to attach to the editor container element.
 */
export function useCodeMirror( {
	text,
	language,
	placeholder: placeholderText,
	handlers,
}: Props ) {
	const [ container, setContainer ] = useState< HTMLDivElement | null >(
		null
	);
	const viewRef = useRef< EditorView | null >( null );
	const languageConf = useRef( new Compartment() );

	// The CodeMirror keymap and update listener are created once on mount,
	// so values they need are read fresh through a ref.
	const handlersRef = useRef( handlers );
	handlersRef.current = handlers;

	useEffect( () => {
		const parent = container;
		if ( ! parent ) {
			return;
		}

		// Exits the block when the caret is on the topmost / bottommost visual
		// line. coordsAtPos reports on-screen positions, so word-wrapped lines
		// are handled correctly: the caret shares the document edge's vertical
		// offset only when it sits on the edge visual line.
		const exitBlock =
			( forward: boolean ) =>
			( view: EditorView ): boolean => {
				const range = view.state.selection.main;
				if ( ! range.empty ) {
					return false;
				}
				const caret = view.coordsAtPos( range.head );
				if ( ! caret ) {
					return false;
				}
				const currentHandlers = handlersRef.current;

				if ( ! forward ) {
					const start = view.coordsAtPos( 0 );
					if (
						! start ||
						caret.top !== start.top ||
						! currentHandlers.previousBlockClientId
					) {
						return false;
					}
					currentHandlers.selectBlock(
						currentHandlers.previousBlockClientId,
						-1
					);
					return true;
				}

				const end = view.coordsAtPos( view.state.doc.length );
				if ( ! end || caret.bottom !== end.bottom ) {
					return false;
				}
				if ( currentHandlers.nextBlockClientId ) {
					currentHandlers.selectBlock(
						currentHandlers.nextBlockClientId,
						0
					);
					return true;
				}
				const defaultBlockName = getDefaultBlockName();
				if ( ! defaultBlockName ) {
					return false;
				}
				currentHandlers.insertBlocksAfter?.( [
					createBlock( defaultBlockName ),
				] );
				return true;
			};

		const view = new EditorView( {
			parent,
			state: EditorState.create( {
				doc: text,
				extensions: [
					history(),
					EditorView.lineWrapping,
					...( placeholderText
						? [ placeholder( placeholderText ) ]
						: [] ),
					syntaxHighlighting( defaultHighlightStyle, {
						fallback: true,
					} ),
					languageConf.current.of( [] ),
					keymap.of( [
						{ key: 'ArrowUp', run: exitBlock( false ) },
						{ key: 'ArrowDown', run: exitBlock( true ) },
						indentWithTab,
						...defaultKeymap,
						...historyKeymap,
					] ),
					EditorView.updateListener.of( ( update ) => {
						if ( update.docChanged ) {
							handlersRef.current.onChange(
								update.state.doc.toString()
							);
						}
					} ),
				],
			} ),
		} );
		viewRef.current = view;

		return () => {
			view.destroy();
			viewRef.current = null;
		};
		// `text` seeds the document each time the editor is created; later
		// changes are synced by the effect below.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ container ] );

	// Sync content changed outside the editor (undo/redo, markdown re-import).
	useEffect( () => {
		const view = viewRef.current;
		if ( ! view ) {
			return;
		}
		const current = view.state.doc.toString();
		if ( current !== text ) {
			view.dispatch( {
				changes: { from: 0, to: current.length, insert: text },
			} );
		}
	}, [ text ] );

	// Load and apply the syntax highlighting for the current language.
	useEffect( () => {
		const view = viewRef.current;
		if ( ! view ) {
			return;
		}
		const description = LanguageDescription.matchLanguageName(
			CODE_LANGUAGES,
			language,
			true
		);
		if ( ! description ) {
			view.dispatch( {
				effects: languageConf.current.reconfigure( [] ),
			} );
			return;
		}
		let cancelled = false;
		description.load().then( ( support ) => {
			if ( ! cancelled ) {
				view.dispatch( {
					effects: languageConf.current.reconfigure( support ),
				} );
			}
		} );
		return () => {
			cancelled = true;
		};
	}, [ language, container ] );

	return setContainer;
}
