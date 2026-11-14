/**
 * External dependencies
 */
import { openUrl } from '@tauri-apps/plugin-opener';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * WordPress dependencies
 */
import { createInterpolateElement } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Badge,
	Button,
	Card,
	CollapsibleCard,
	InputControl,
	Link,
	Notice,
	SelectControl,
	Spinner,
	Stack,
	Text,
} from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { PROVIDERS, type AiProvider } from '../../ai/providers';
import {
	checkApiKey,
	deleteApiKey,
	listModels,
	saveApiKey,
	type AiModel,
} from '../../ai/settings';

type Props = {
	provider: AiProvider;
	/**
	 * Whether an API key is saved for the provider, or `null` while it is
	 * not known yet.
	 */
	hasKey: boolean | null;
	/**
	 * The chosen model's id, or an empty string for the default model.
	 */
	model: string;
	onKeyChange: ( hasKey: boolean ) => void;
	onModelChange: ( model: string ) => void;
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
 * The name of a model, or its id when the API key's models do not list it.
 *
 * @param models The models the API key can use.
 * @param id     The model's id.
 */
function getModelName( models: AiModel[], id: string ) {
	return models.find( ( model ) => model.id === id )?.displayName ?? id;
}

/**
 * The items of the model list: the default model first, then the models the
 * API key can use. A chosen model that is not listed stays, so the setting
 * is not lost while the list cannot be loaded.
 *
 * @param models       The models the API key can use.
 * @param chosen       The chosen model's id, or an empty string.
 * @param defaultModel The id of the provider's default model.
 */
export function getModelItems(
	models: AiModel[],
	chosen: string,
	defaultModel: string
) {
	const items: ModelItem[] = [
		{
			value: DEFAULT_MODEL_ITEM,
			label: sprintf(
				/* translators: %s: The name of the default AI model. */
				__( 'Default (%s)', 'mark-bricks' ),
				getModelName( models, defaultModel )
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

// A card to connect a provider with its API key, and to choose its model.
export function AiProviderCard( {
	provider,
	hasKey,
	model,
	onKeyChange,
	onModelChange,
}: Props ) {
	const providerInfo = PROVIDERS[ provider ];
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
			next = { kind: 'loaded', models: await listModels( provider ) };
		} catch ( error ) {
			next = { kind: 'error', message: ( error as Error ).message };
		}
		if ( request === modelsRequest.current ) {
			setModels( next );
		}
	}, [ provider ] );

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
			await checkApiKey( provider, key );
		} catch ( error ) {
			setKeyStatus( {
				kind: 'error',
				message: ( error as Error ).message,
			} );
			return;
		}
		try {
			await saveApiKey( provider, key );
			setKey( '' );
			setKeyStatus( { kind: 'saved' } );
			onKeyChange( true );
		} catch ( error ) {
			setKeyStatus( { kind: 'error', message: String( error ) } );
		}
	};

	const onDelete = async () => {
		setKeyStatus( { kind: 'busy' } );
		try {
			await deleteApiKey( provider );
			setKeyStatus( { kind: 'deleted' } );
			onKeyChange( false );
			// The model was chosen for that key.
			onModelChange( '' );
		} catch ( error ) {
			setKeyStatus( { kind: 'error', message: String( error ) } );
		}
	};

	const isBusy = keyStatus.kind === 'busy';
	const loadedModels = models.kind === 'loaded' ? models.models : [];
	const modelItems = getModelItems(
		loadedModels,
		model,
		providerInfo.defaultModel
	);
	const keyHost = new URL( providerInfo.keyUrl ).host;
	const usageHost = new URL( providerInfo.usageUrl ).host;

	return (
		<CollapsibleCard.Root className="preferences-modal__provider-card">
			<CollapsibleCard.Header>
				<Stack
					direction="row"
					gap="sm"
					justify="space-between"
					align="flex-start"
				>
					<Stack direction="column" gap="sm">
						<Card.Title>{ providerInfo.name }</Card.Title>
						{ hasKey && (
							<CollapsibleCard.HeaderDescription>
								{ sprintf(
									/* translators: %s: The name of the AI model, such as Claude Opus 5.5. */
									__( 'Model: %s', 'mark-bricks' ),
									getModelName(
										loadedModels,
										model || providerInfo.defaultModel
									)
								) }
							</CollapsibleCard.HeaderDescription>
						) }
					</Stack>
					{ hasKey && (
						<Badge intent="stable">
							{ __( 'Connected', 'mark-bricks' ) }
						</Badge>
					) }
					{ hasKey === false && (
						<Badge intent="none">
							{ __( 'Not connected', 'mark-bricks' ) }
						</Badge>
					) }
				</Stack>
			</CollapsibleCard.Header>
			<CollapsibleCard.Content>
				<Stack direction="column" gap="lg">
					<Notice.Root intent="info">
						<Notice.Description>
							{ sprintf(
								/* translators: %s: The name of the AI provider, such as Anthropic. */
								__(
									'The API key is kept in the system’s credential store and only sent to the %s API.',
									'mark-bricks'
								),
								providerInfo.name
							) }
						</Notice.Description>
					</Notice.Root>
					<form
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
								placeholder={ providerInfo.keyPlaceholder }
								// The saved key never reaches the webview, so
								// a placeholder value stands for it.
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
					<Stack direction="column" gap="xs">
						<Text variant="body-sm" render={ <p /> }>
							{ createInterpolateElement(
								sprintf(
									/* translators: %s: The address of the site where API keys are created, such as platform.claude.com. */
									__(
										'Get your API key at <a>%s</a>',
										'mark-bricks'
									),
									keyHost
								),
								{
									a: (
										<Link
											href={ providerInfo.keyUrl }
											openInNewTab
											onClick={ ( event ) => {
												event.preventDefault();
												openUrl( providerInfo.keyUrl );
											} }
										/>
									),
								}
							) }
						</Text>
						<Text variant="body-sm" render={ <p /> }>
							{ createInterpolateElement(
								sprintf(
									/* translators: %s: The address of the site that shows the API's usage and billing, such as platform.claude.com. */
									__(
										'Check your usage and billing at <a>%s</a>',
										'mark-bricks'
									),
									usageHost
								),
								{
									a: (
										<Link
											href={ providerInfo.usageUrl }
											openInNewTab
											onClick={ ( event ) => {
												event.preventDefault();
												openUrl(
													providerInfo.usageUrl
												);
											} }
										/>
									),
								}
							) }
						</Text>
					</Stack>
					{ keyStatus.kind === 'saved' && (
						<Notice.Root intent="success">
							<Notice.Description>
								{ __(
									'The API key was saved.',
									'mark-bricks'
								) }
							</Notice.Description>
						</Notice.Root>
					) }
					{ keyStatus.kind === 'deleted' && (
						<Notice.Root intent="success">
							<Notice.Description>
								{ __(
									'The API key was deleted.',
									'mark-bricks'
								) }
							</Notice.Description>
						</Notice.Root>
					) }
					{ keyStatus.kind === 'error' && (
						<Notice.Root intent="error">
							<Notice.Description>
								{ keyStatus.message }
							</Notice.Description>
						</Notice.Root>
					) }
					{ hasKey &&
						( models.kind === 'loading' ? (
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
											( model || DEFAULT_MODEL_ITEM )
									) ?? null
								}
								isItemEqualToValue={ ( a, b ) =>
									a.value === b.value
								}
								onValueChange={ ( item ) => {
									if ( item ) {
										onModelChange(
											item.value === DEFAULT_MODEL_ITEM
												? ''
												: ( item.value ?? '' )
										);
									}
								} }
							/>
						) ) }
					{ hasKey && models.kind === 'error' && (
						<Notice.Root intent="warning">
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
			</CollapsibleCard.Content>
		</CollapsibleCard.Root>
	);
}
