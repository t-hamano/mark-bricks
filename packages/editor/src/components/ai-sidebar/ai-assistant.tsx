/**
 * External dependencies
 */
import { useCallback, useContext, type RefObject } from 'react';

/**
 * WordPress dependencies
 */
import { __unstableAnimatePresence as AnimatePresence } from '@wordpress/components';
import { useRegistry } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { createBlockEditTarget } from '../../ai/block-edit-target';
import { getBlockEditorAccess } from '../../ai/block-editor-access';
import { createTextEditTarget } from '../../ai/text-edit-target';
import { getTextEditorAccess } from '../../ai/text-editor-access';
import { TextEditorContext } from '../../ai/text-editor-context';
import { useAiChat } from '../../ai/use-ai-chat';
import { useSelectionSummary } from '../../ai/use-selection-summary';
import { usePlatform } from '../../platform';
import { AiSidebar } from './sidebar';

type Props = {
	toggleRef: RefObject< HTMLButtonElement | null >;
	isOpened: boolean;
	editorMode: 'visual' | 'text';
	frontMatter: string | null;
	setFrontMatter: ( next: string | null ) => void;
	mergeFrontMatter: ( next: string | null ) => void;
};

/**
 * Keeps the conversation with the AI assistant while the sidebar is closed,
 * and shows the sidebar when it is open. Must be rendered inside
 * `BlockEditorProvider`, whose registry holds the document's blocks.
 *
 * @param props                  Props.
 * @param props.toggleRef        The header button that toggles the sidebar.
 * @param props.isOpened         Whether the sidebar is open.
 * @param props.editorMode       The active editor mode.
 * @param props.frontMatter      The document's front matter.
 * @param props.setFrontMatter   Replaces the document's front matter.
 * @param props.mergeFrontMatter Replaces the document's front matter as part of the last undo step.
 */
export function AiAssistant( {
	toggleRef,
	isOpened,
	editorMode,
	frontMatter,
	setFrontMatter,
	mergeFrontMatter,
}: Props ) {
	const { ai } = usePlatform();
	const registry = useRegistry();
	const textEditor = useContext( TextEditorContext )?.editor ?? null;

	const createTarget = useCallback( () => {
		if ( editorMode === 'text' ) {
			return textEditor
				? createTextEditTarget( getTextEditorAccess( textEditor ) )
				: null;
		}
		return createBlockEditTarget(
			getBlockEditorAccess( registry ),
			frontMatter,
			{ set: setFrontMatter, merge: mergeFrontMatter }
		);
	}, [
		editorMode,
		registry,
		frontMatter,
		setFrontMatter,
		mergeFrontMatter,
		textEditor,
	] );

	const chat = useAiChat( { ai, editorMode, createTarget } );
	const selectionSummary = useSelectionSummary( editorMode, textEditor );

	return (
		<AnimatePresence initial={ false }>
			{ isOpened && (
				<AiSidebar
					toggleRef={ toggleRef }
					chat={ chat }
					selectionSummary={ selectionSummary }
				/>
			) }
		</AnimatePresence>
	);
}
