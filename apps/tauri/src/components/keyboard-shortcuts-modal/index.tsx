/**
 * External dependencies
 */
import { Fragment } from 'react';
import {
	useEditorShortcuts,
	type ShortcutKeyCombinationData,
	type ShortcutEntry,
} from '@mark-bricks/editor';

/**
 * WordPress dependencies
 */
import { Modal } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as interfaceStore } from '@wordpress/interface';
import { store as keyboardShortcutsStore } from '@wordpress/keyboard-shortcuts';
import { displayShortcutList, shortcutAriaLabel } from '@wordpress/keycodes';
import { Stack } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import './style.scss';

export const KEYBOARD_SHORTCUTS_MODAL_NAME = 'mark-bricks/keyboard-shortcuts';

const FILE_SHORTCUTS: ShortcutEntry[] = [
	'mark-bricks/new-file',
	'mark-bricks/open-file',
	'mark-bricks/save-file',
	'mark-bricks/save-file-as',
	'mark-bricks/close-tab',
];

type KeyCombinationProps = {
	keyCombination: ShortcutKeyCombinationData;
	forceAriaLabel?: string;
};

function KeyCombination( {
	keyCombination,
	forceAriaLabel,
}: KeyCombinationProps ) {
	const { modifier, character } = keyCombination;
	const parts: string[] = modifier
		? displayShortcutList[ modifier ]( character )
		: [ character ];
	const ariaLabel = modifier
		? shortcutAriaLabel[ modifier ]( character )
		: character;

	return (
		<Stack
			render={ <kbd /> }
			className="keyboard-shortcuts-modal__shortcut-key-combination"
			align="center"
			gap="xs"
			aria-label={ forceAriaLabel || ariaLabel }
		>
			{ parts.map( ( part, index ) => {
				if ( part === '+' ) {
					return <Fragment key={ index }>{ part }</Fragment>;
				}
				return (
					<kbd
						key={ index }
						className="keyboard-shortcuts-modal__shortcut-key"
					>
						{ part }
					</kbd>
				);
			} ) }
		</Stack>
	);
}

type ShortcutRowProps = {
	description: string | null;
	keyCombination: ShortcutKeyCombinationData;
	aliases?: ShortcutKeyCombinationData[];
	ariaLabel?: string;
};

function ShortcutRow( {
	description,
	keyCombination,
	aliases = [],
	ariaLabel,
}: ShortcutRowProps ) {
	return (
		<>
			<div className="keyboard-shortcuts-modal__shortcut-description">
				{ description }
			</div>
			<Stack
				className="keyboard-shortcuts-modal__shortcut-term"
				direction="column"
				gap="sm"
				align="flex-end"
			>
				<KeyCombination
					keyCombination={ keyCombination }
					forceAriaLabel={ ariaLabel }
				/>
				{ aliases.map( ( alias, index ) => (
					<KeyCombination
						key={ index }
						keyCombination={ alias }
						forceAriaLabel={ ariaLabel }
					/>
				) ) }
			</Stack>
		</>
	);
}

function DynamicShortcut( { name }: { name: string } ) {
	const { description, keyCombination, aliases } = useSelect(
		( select ) => {
			const {
				getShortcutDescription,
				getShortcutKeyCombination,
				getShortcutAliases,
			} = select( keyboardShortcutsStore );
			return {
				description: getShortcutDescription( name ),
				keyCombination: getShortcutKeyCombination( name ),
				aliases: getShortcutAliases( name ),
			};
		},
		[ name ]
	);

	if ( ! keyCombination ) {
		return null;
	}

	return (
		<ShortcutRow
			description={ description }
			keyCombination={ keyCombination }
			aliases={ aliases }
		/>
	);
}

function ShortcutSection( {
	title,
	shortcuts,
}: {
	title: string;
	shortcuts: ShortcutEntry[];
} ) {
	if ( shortcuts.length === 0 ) {
		return null;
	}
	return (
		<section className="keyboard-shortcuts-modal__section">
			<h2 className="keyboard-shortcuts-modal__section-title">
				{ title }
			</h2>
			<ul className="keyboard-shortcuts-modal__shortcut-list">
				{ shortcuts.map( ( entry, index ) => (
					<Stack
						key={ typeof entry === 'string' ? entry : index }
						render={ <li /> }
						className="keyboard-shortcuts-modal__shortcut"
						justify="space-between"
						gap="md"
					>
						{ typeof entry === 'string' ? (
							<DynamicShortcut name={ entry } />
						) : (
							<ShortcutRow
								description={ entry.description }
								keyCombination={ entry.keyCombination }
								aliases={ entry.aliases }
								ariaLabel={ entry.ariaLabel }
							/>
						) }
					</Stack>
				) ) }
			</ul>
		</section>
	);
}

export default function KeyboardShortcutsModal() {
	const { closeModal } = useDispatch( interfaceStore );
	const isOpened = useSelect(
		( select ) =>
			select( interfaceStore ).isModalActive(
				KEYBOARD_SHORTCUTS_MODAL_NAME
			),
		[]
	);
	const {
		global: globalShortcuts,
		selection: selectionShortcuts,
		block: blockShortcuts,
		listView: listViewShortcuts,
		textFormatting: textFormattingShortcuts,
	} = useEditorShortcuts();

	if ( ! isOpened ) {
		return null;
	}

	return (
		<Modal
			title={ __( 'Keyboard shortcuts', 'mark-bricks' ) }
			onRequestClose={ () => closeModal() }
			className="keyboard-shortcuts-modal"
			size="medium"
		>
			<Stack direction="column" gap="xl">
				<ul className="keyboard-shortcuts-modal__main-shortcuts keyboard-shortcuts-modal__shortcut-list">
					<Stack
						render={ <li /> }
						className="keyboard-shortcuts-modal__shortcut"
						justify="space-between"
						gap="md"
					>
						<DynamicShortcut name="mark-bricks/keyboard-shortcuts" />
					</Stack>
				</ul>
				<ShortcutSection
					title={ __( 'File shortcuts', 'mark-bricks' ) }
					shortcuts={ FILE_SHORTCUTS }
				/>
				<ShortcutSection
					title={ __( 'Global shortcuts', 'mark-bricks' ) }
					shortcuts={ globalShortcuts }
				/>
				<ShortcutSection
					title={ __( 'Selection shortcuts', 'mark-bricks' ) }
					shortcuts={ selectionShortcuts }
				/>
				<ShortcutSection
					title={ __( 'Block shortcuts', 'mark-bricks' ) }
					shortcuts={ blockShortcuts }
				/>
				<ShortcutSection
					title={ __( 'Text formatting', 'mark-bricks' ) }
					shortcuts={ textFormattingShortcuts }
				/>
				<ShortcutSection
					title={ __( 'List View shortcuts', 'mark-bricks' ) }
					shortcuts={ listViewShortcuts }
				/>
			</Stack>
		</Modal>
	);
}
