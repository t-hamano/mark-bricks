/**
 * External dependencies
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import {
	Button,
	InputControl,
	Notice,
	SelectControl,
	Spinner,
	Stack,
	Text,
} from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { DEFAULT_MODEL } from '../../ai/anthropic';
import {
	checkApiKey,
	deleteApiKey,
	hasApiKey,
	listModels,
	saveApiKey,
	type AiModel,
} from '../../ai/settings';

export type AiSettings = {
	/**
	 * The model's id, or an empty string for the default model.
	 */
	model: string;
};

type Props = {
	settings: AiSettings;
	onChange: ( edits: Partial< AiSettings > ) => void;
};

type KeyStatus =
	| { kind: 'idle' }
	| { kind: 'busy' }
	| { kind: 'saved' }
	| { kind: 'deleted' }
	| { kind: 'error'; message: string };

type Models =
	| { kind: 'none' }
	| { kind: 'loading' }
	| { kind: 'loaded'; models: AiModel[] }
	| { kind: 'error'; message: string };

type ModelItem = { value: string; label: string };

/**
 * The value shown, masked, in place of a saved API key.
 */
const SAVED_KEY_MASK = '•'.repeat( 24 );

/**
 * The item value of the default model. The select shows its placeholder for
 * an empty value, so the setting's empty string is not used as is.
 */
export const DEFAULT_MODEL_ITEM = 'default';

/**
 * The items of the model list: the default model first, then the models the
 * API key can use. A chosen model that is not listed stays, so the setting
 * is not lost while the list cannot be loaded.
 *
 * @param models The models the API key can use.
 * @param chosen The chosen model's id, or an empty string.
 */
export function getModelItems( models: AiModel[], chosen: string ) {
	const defaultName =
		models.find( ( model ) => model.id === DEFAULT_MODEL )?.displayName ??
		DEFAULT_MODEL;
	const items: ModelItem[] = [
		{
			value: DEFAULT_MODEL_ITEM,
			label: sprintf(
				/* translators: %s: The name of the default AI model. */
				__( 'Default (%s)', 'mark-bricks' ),
				defaultName
			),
		},
		...models.map( ( model ) => ( {
			value: model.id,
			label: model.displayName,
		} ) ),
	];
	if ( chosen && ! models.some( ( model ) => model.id === chosen ) ) {
		items.push( { value: chosen, label: chosen } );
	}
	return items;
}

export function AiPanel( { settings, onChange }: Props ) {
	const [ hasKey, setHasKey ] = useState< boolean | null >( null );
	const [ key, setKey ] = useState( '' );
	const [ keyStatus, setKeyStatus ] = useState< KeyStatus >( {
		kind: 'idle',
	} );
	const [ models, setModels ] = useState< Models >( { kind: 'none' } );

	// Counts the model requests, so that the answer to a request made for a
	// key that was since replaced or deleted is ignored.
	const modelsRequest = useRef( 0 );

	const loadModels = useCallback( async () => {
		const request = ++modelsRequest.current;
		setModels( { kind: 'loading' } );
		let next: Models;
		try {
			next = { kind: 'loaded', models: await listModels() };
		} catch ( error ) {
			next = { kind: 'error', message: ( error as Error ).message };
		}
		if ( request === modelsRequest.current ) {
			setModels( next );
		}
	}, [] );

	useEffect( () => {
		let isCurrent = true;
		hasApiKey().then(
			( value ) => {
				if ( isCurrent ) {
					setHasKey( value );
				}
			},
			() => {
				if ( isCurrent ) {
					setHasKey( false );
				}
			}
		);
		return () => {
			isCurrent = false;
		};
	}, [] );

	useEffect( () => {
		if ( hasKey ) {
			loadModels();
		} else {
			modelsRequest.current++;
			setModels( { kind: 'none' } );
		}
	}, [ hasKey, loadModels ] );

	const onSave = async () => {
		setKeyStatus( { kind: 'busy' } );
		try {
			await checkApiKey( key );
		} catch ( error ) {
			setKeyStatus( {
				kind: 'error',
				message: ( error as Error ).message,
			} );
			return;
		}
		try {
			await saveApiKey( key );
			setKey( '' );
			setKeyStatus( { kind: 'saved' } );
			setHasKey( true );
		} catch ( error ) {
			setKeyStatus( { kind: 'error', message: String( error ) } );
		}
	};

	const onDelete = async () => {
		setKeyStatus( { kind: 'busy' } );
		try {
			await deleteApiKey();
			setKeyStatus( { kind: 'deleted' } );
			setHasKey( false );
			// The model was chosen for that key.
			onChange( { model: '' } );
		} catch ( error ) {
			setKeyStatus( { kind: 'error', message: String( error ) } );
		}
	};

	const isBusy = keyStatus.kind === 'busy';
	const modelItems = getModelItems(
		models.kind === 'loaded' ? models.models : [],
		settings.model
	);

	return (
		<Stack direction="column" gap="xl">
			<Stack direction="column" gap="md" align="flex-start">
				<Text variant="heading-xl" render={ <h2 /> }>
					{ __( 'Anthropic API key', 'mark-bricks' ) }
				</Text>
				<Notice.Root
					className="preferences-modal__notice"
					intent="info"
				>
					<Notice.Description>
						{ __(
							'The API key is kept in the system’s credential store and only sent to the Anthropic API.',
							'mark-bricks'
						) }
					</Notice.Description>
				</Notice.Root>
				<form
					className="preferences-modal__api-key-form"
					onSubmit={ ( event ) => {
						event.preventDefault();
						if ( isBusy ) {
							return;
						}
						if ( hasKey ) {
							onDelete();
						} else if ( key.trim() ) {
							onSave();
						}
					} }
				>
					<Stack direction="row" gap="sm" align="flex-end">
						<InputControl
							className="preferences-modal__api-key-input"
							size="compact"
							type="password"
							autoComplete="off"
							spellCheck={ false }
							label={ __( 'API key', 'mark-bricks' ) }
							placeholder="sk-ant-…"
							// The saved key never reaches the webview, so a
							// placeholder value stands for it.
							value={ hasKey ? SAVED_KEY_MASK : key }
							onValueChange={ setKey }
							disabled={ !! hasKey }
						/>
						<Button
							type="submit"
							variant="outline"
							size="compact"
							disabled={
								hasKey === null ||
								isBusy ||
								( ! hasKey && ! key.trim() )
							}
							loading={ isBusy }
							loadingAnnouncement={
								hasKey
									? __(
											'Deleting the API key…',
											'mark-bricks'
										)
									: __(
											'Checking the API key…',
											'mark-bricks'
										)
							}
						>
							{ hasKey
								? __( 'Delete', 'mark-bricks' )
								: __( 'Save', 'mark-bricks' ) }
						</Button>
					</Stack>
				</form>
				{ keyStatus.kind === 'saved' && (
					<Notice.Root
						className="preferences-modal__notice"
						intent="success"
					>
						<Notice.Description>
							{ __( 'The API key was saved.', 'mark-bricks' ) }
						</Notice.Description>
					</Notice.Root>
				) }
				{ keyStatus.kind === 'deleted' && (
					<Notice.Root
						className="preferences-modal__notice"
						intent="success"
					>
						<Notice.Description>
							{ __( 'The API key was deleted.', 'mark-bricks' ) }
						</Notice.Description>
					</Notice.Root>
				) }
				{ keyStatus.kind === 'error' && (
					<Notice.Root
						className="preferences-modal__notice"
						intent="error"
					>
						<Notice.Description>
							{ keyStatus.message }
						</Notice.Description>
					</Notice.Root>
				) }
			</Stack>
			{ hasKey && (
				<Stack direction="column" gap="md" align="flex-start">
					{ models.kind === 'loading' ? (
						<Spinner
							aria-label={ __(
								'Loading the models…',
								'mark-bricks'
							) }
						/>
					) : (
						<SelectControl
							size="compact"
							label={ __( 'Model', 'mark-bricks' ) }
							items={ modelItems }
							value={
								modelItems.find(
									( item ) =>
										item.value ===
										( settings.model || DEFAULT_MODEL_ITEM )
								) ?? null
							}
							isItemEqualToValue={ ( a, b ) =>
								a.value === b.value
							}
							onValueChange={ ( item ) => {
								if ( item ) {
									onChange( {
										model:
											item.value === DEFAULT_MODEL_ITEM
												? ''
												: ( item.value ?? '' ),
									} );
								}
							} }
						/>
					) }
					{ models.kind === 'error' && (
						<Notice.Root
							className="preferences-modal__notice"
							intent="warning"
						>
							<Notice.Description>
								{ sprintf(
									/* translators: %s: Why the models could not be loaded. */
									__(
										'The models could not be loaded: %s',
										'mark-bricks'
									),
									models.message
								) }
							</Notice.Description>
							<Notice.Actions>
								<Notice.ActionButton onClick={ loadModels }>
									{ __( 'Try again', 'mark-bricks' ) }
								</Notice.ActionButton>
							</Notice.Actions>
						</Notice.Root>
					) }
				</Stack>
			) }
		</Stack>
	);
}
