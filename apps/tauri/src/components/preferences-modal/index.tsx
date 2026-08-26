/**
 * External dependencies
 */
import { useState } from 'react';
import { getLocale, type CodeEditorSettings } from '@mark-bricks/editor';

/**
 * WordPress dependencies
 */
import { useViewportMatch } from '@wordpress/compose';
import { dispatch, useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as interfaceStore } from '@wordpress/interface';
import { store as preferencesStore } from '@wordpress/preferences';
import { Dialog, getWpCompatOverlaySlot, Stack, Tabs } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { CodeEditorPanel } from './code-editor-panel';
import { GeneralPanel, type GeneralSettings } from './general-panel';
import {
	VisualEditorPanel,
	type VisualEditorSettings,
} from './visual-editor-panel';
import { DEFAULT_PREFERENCES } from '../../preferences/constants';
import './style.scss';

export const PREFERENCES_MODAL_NAME = 'mark-bricks/preferences';

export default function PreferencesModal() {
	const [ locale, setLocale ] = useState( getLocale );

	const { closeModal } = useDispatch( interfaceStore );
	const { set: setPreference } = useDispatch( preferencesStore );
	const isLargeViewport = useViewportMatch( 'medium' );

	const {
		isOpened,
		codeEditor,
		checkUpdatesAuto,
		spellCheck,
		showListViewByDefault,
		editorStyles,
	} = useSelect( ( select ) => {
		const { get } = select( preferencesStore );
		return {
			isOpened: select( interfaceStore ).isModalActive(
				PREFERENCES_MODAL_NAME
			),
			codeEditor:
				get( 'mark-bricks', 'codeEditor' ) ??
				DEFAULT_PREFERENCES[ 'mark-bricks' ].codeEditor,
			checkUpdatesAuto: !! get( 'mark-bricks', 'checkUpdatesAuto' ),
			spellCheck: !! get( 'mark-bricks', 'spellCheck' ),
			showListViewByDefault: !! get( 'core', 'showListViewByDefault' ),
			editorStyles:
				get( 'mark-bricks', 'editorStyles' ) ??
				DEFAULT_PREFERENCES[ 'mark-bricks' ].editorStyles,
		};
	}, [] );

	if ( ! isOpened ) {
		return null;
	}

	const handleGeneralChange = async ( edits: Partial< GeneralSettings > ) => {
		if ( edits.locale !== undefined && edits.locale !== locale ) {
			// Update the dropdown selection and persist it; the new locale
			// takes effect on the next app launch, where `main.tsx` applies
			// it before the app loads.
			setLocale( edits.locale );
			await dispatch( preferencesStore ).set(
				'mark-bricks',
				'language',
				edits.locale
			);
		}
		if ( edits.checkUpdatesAuto !== undefined ) {
			setPreference(
				'mark-bricks',
				'checkUpdatesAuto',
				edits.checkUpdatesAuto
			);
		}
	};

	const handleVisualEditorChange = (
		edits: Partial< VisualEditorSettings >
	) => {
		if ( edits.spellCheck !== undefined ) {
			setPreference( 'mark-bricks', 'spellCheck', edits.spellCheck );
		}
		if ( edits.showListViewByDefault !== undefined ) {
			setPreference(
				'core',
				'showListViewByDefault',
				edits.showListViewByDefault
			);
		}
		if (
			edits.contentWidth !== undefined ||
			edits.fontSize !== undefined ||
			edits.fontFamily !== undefined
		) {
			setPreference( 'mark-bricks', 'editorStyles', {
				...editorStyles,
				...( edits.contentWidth !== undefined && {
					contentWidth: edits.contentWidth,
				} ),
				...( edits.fontSize !== undefined && {
					fontSize: edits.fontSize,
				} ),
				...( edits.fontFamily !== undefined && {
					fontFamily: edits.fontFamily,
				} ),
			} );
		}
	};

	const handleCodeEditorChange = ( edits: Partial< CodeEditorSettings > ) => {
		setPreference( 'mark-bricks', 'codeEditor', {
			...codeEditor,
			...edits,
		} );
	};

	return (
		<Dialog.Root
			open
			onOpenChange={ ( open ) => {
				if ( ! open ) {
					closeModal();
				}
			} }
		>
			<Dialog.Popup
				className="preferences-modal"
				size="large"
				portal={
					<Dialog.Portal container={ getWpCompatOverlaySlot() } />
				}
			>
				<Dialog.Header>
					<Dialog.Title>
						{ __( 'Preferences', 'mark-bricks' ) }
					</Dialog.Title>
					<Dialog.CloseIcon label={ __( 'Close', 'mark-bricks' ) } />
				</Dialog.Header>
				<Dialog.Content>
					<Tabs.Root
						defaultValue="general"
						orientation="vertical"
						render={ ( props ) => (
							<Stack
								{ ...props }
								direction={ isLargeViewport ? 'row' : 'column' }
								gap="xl"
								align={ isLargeViewport ? 'start' : undefined }
							/>
						) }
					>
						<Tabs.List className="preferences-modal__tabs">
							<Tabs.Tab value="general">
								{ __( 'General', 'mark-bricks' ) }
							</Tabs.Tab>
							<Tabs.Tab value="visual-editor">
								{ __( 'Visual editor', 'mark-bricks' ) }
							</Tabs.Tab>
							<Tabs.Tab value="code-editor">
								{ __( 'Code editor', 'mark-bricks' ) }
							</Tabs.Tab>
						</Tabs.List>
						<Tabs.Panel
							value="general"
							className="preferences-modal__panel"
							tabIndex={ -1 }
						>
							<GeneralPanel
								settings={ {
									locale,
									checkUpdatesAuto,
								} }
								onChange={ handleGeneralChange }
							/>
						</Tabs.Panel>
						<Tabs.Panel
							value="visual-editor"
							className="preferences-modal__panel"
							tabIndex={ -1 }
						>
							<VisualEditorPanel
								settings={ {
									spellCheck,
									showListViewByDefault,
									contentWidth:
										editorStyles.contentWidth ??
										DEFAULT_PREFERENCES[ 'mark-bricks' ]
											.editorStyles.contentWidth,
									fontSize:
										editorStyles.fontSize ??
										DEFAULT_PREFERENCES[ 'mark-bricks' ]
											.editorStyles.fontSize,
									fontFamily:
										editorStyles.fontFamily ??
										DEFAULT_PREFERENCES[ 'mark-bricks' ]
											.editorStyles.fontFamily,
								} }
								onChange={ handleVisualEditorChange }
							/>
						</Tabs.Panel>
						<Tabs.Panel
							value="code-editor"
							className="preferences-modal__panel"
							tabIndex={ -1 }
						>
							<CodeEditorPanel
								settings={ codeEditor }
								onChange={ handleCodeEditorChange }
							/>
						</Tabs.Panel>
					</Tabs.Root>
				</Dialog.Content>
			</Dialog.Popup>
		</Dialog.Root>
	);
}
