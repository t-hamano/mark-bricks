/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as keyboardShortcutsStore } from '@wordpress/keyboard-shortcuts';
import type { WPKeycodeModifier } from '@wordpress/keycodes';

export type ShortcutKeyCombinationData = {
	character: string;
	modifier: WPKeycodeModifier | undefined;
};

type StaticShortcutEntry = {
	description: string;
	keyCombination: ShortcutKeyCombinationData;
	aliases?: ShortcutKeyCombinationData[];
	ariaLabel?: string;
};

export type ShortcutEntry = string | StaticShortcutEntry;

/**
 * Core block-editor shortcuts that are not relevant to this editor and should
 * be hidden from the shortcuts modal.
 */
const EXCLUDED_CORE_SHORTCUTS = new Set( [
	'core/block-editor/stop-editing-as-blocks',
	'core/block-editor/group',
	'core/block-editor/toggle-block-visibility',
	'core/block-editor/rename',
] );

/**
 * Removes excluded core shortcuts from a list of shortcut names.
 *
 * @param names Shortcut names, e.g. from `getCategoryShortcuts`.
 * @return The list without excluded core shortcuts.
 */
function excludeCoreShortcuts( names: string[] ): string[] {
	return names.filter( ( name ) => ! EXCLUDED_CORE_SHORTCUTS.has( name ) );
}

export type EditorShortcuts = {
	global: ShortcutEntry[];
	selection: ShortcutEntry[];
	block: ShortcutEntry[];
	listView: ShortcutEntry[];
	textFormatting: ShortcutEntry[];
};

/**
 * Returns the shortcuts for the `selection`, `block`, `list-view` and
 * `text-formatting` categories, with excluded core shortcuts filtered out and
 * static (non-registered) shortcuts merged in.
 *
 * @return Shortcut entries per category.
 */
export function useEditorShortcuts(): EditorShortcuts {
	return useSelect( ( select ) => {
		const { getCategoryShortcuts } = select( keyboardShortcutsStore );
		return {
			global: [
				'mark-bricks/toggle-mode',
				'mark-bricks/undo',
				'mark-bricks/redo',
				'mark-bricks/toggle-list-view',
			],
			selection: excludeCoreShortcuts(
				getCategoryShortcuts( 'selection' )
			),
			block: [
				...excludeCoreShortcuts( getCategoryShortcuts( 'block' ) ),
				// Static block shortcuts that are not registered in the
				// keyboard-shortcuts store.
				{
					keyCombination: { character: '/', modifier: undefined },
					description: __(
						'Change the block type after adding a new paragraph.',
						'mark-bricks'
					),
					ariaLabel: __( 'Forward-slash', 'mark-bricks' ),
				},
			],
			listView: excludeCoreShortcuts(
				getCategoryShortcuts( 'list-view' )
			),
			// Static text-formatting shortcuts that are not registered in the
			// keyboard-shortcuts store.
			textFormatting: [
				{
					description: __(
						'Make the selected text bold.',
						'mark-bricks'
					),
					keyCombination: { modifier: 'primary', character: 'b' },
				},
				{
					description: __(
						'Make the selected text italic.',
						'mark-bricks'
					),
					keyCombination: { modifier: 'primary', character: 'i' },
				},
				{
					description: __(
						'Convert the selected text into a link.',
						'mark-bricks'
					),
					keyCombination: { modifier: 'primary', character: 'k' },
				},
				{
					description: __( 'Remove a link.', 'mark-bricks' ),
					keyCombination: {
						modifier: 'primaryShift',
						character: 'k',
					},
				},
				{
					description: __(
						'Underline the selected text.',
						'mark-bricks'
					),
					keyCombination: { modifier: 'primary', character: 'u' },
				},
				{
					description: __(
						'Strikethrough the selected text.',
						'mark-bricks'
					),
					keyCombination: { modifier: 'access', character: 'd' },
				},
				{
					description: __(
						'Make the selected text inline code.',
						'mark-bricks'
					),
					keyCombination: { modifier: 'access', character: 'x' },
				},
			] satisfies StaticShortcutEntry[],
		};
	}, [] );
}
