/**
 * External dependencies
 */
import { useEffect, useState } from 'react';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { SelectControl, Stack, TextareaControl } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { AiProviderCard } from './ai-provider-card';
import { hasApiKey } from '../../ai/settings';
import { PROVIDERS, toProvider, type AiProvider } from '../../ai/providers';

export { DEFAULT_MODEL_ITEM, getModelItems } from './ai-provider-card';

export type AiSettings = {
	/**
	 * The provider the assistant uses.
	 */
	provider: AiProvider;
	/**
	 * The model chosen for each provider. A missing or empty model stands
	 * for the provider's default model.
	 */
	models: Partial< Record< AiProvider, string > >;
	/**
	 * The user's instructions, sent with every message.
	 */
	instructions: string;
};

type Props = {
	settings: AiSettings;
	onChange: (
		edits: Pick< Partial< AiSettings >, 'provider' | 'instructions' >
	) => void;
	/**
	 * Called with a provider's new model, or an empty string for its default
	 * model. The change applies to the models saved when it is made, which
	 * may be newer than `settings`, since a key is deleted asynchronously.
	 */
	onModelChange: ( provider: AiProvider, model: string ) => void;
};

const PROVIDER_NAMES = Object.keys( PROVIDERS ) as AiProvider[];

/**
 * Whether each provider has an API key saved, or `null` while it is not
 * known yet.
 */
type Keys = Record< AiProvider, boolean | null >;

/**
 * The provider to use instead of the chosen one, when the chosen one has no
 * API key and another one has.
 *
 * @param provider  The chosen provider.
 * @param connected The providers that have an API key saved.
 * @return The provider to switch to, or `null` to keep the chosen one.
 */
export function getFallbackProvider(
	provider: AiProvider,
	connected: AiProvider[]
): AiProvider | null {
	return connected.length && ! connected.includes( provider )
		? connected[ 0 ]
		: null;
}

export function AiPanel( { settings, onChange, onModelChange }: Props ) {
	const { provider, models, instructions } = settings;
	const [ keys, setKeys ] = useState< Keys >(
		() =>
			Object.fromEntries(
				PROVIDER_NAMES.map( ( name ) => [ name, null ] )
			) as Keys
	);

	useEffect( () => {
		let isCurrent = true;
		for ( const name of PROVIDER_NAMES ) {
			hasApiKey( name ).then(
				( value ) => {
					if ( isCurrent ) {
						setKeys( ( current ) => ( {
							...current,
							[ name ]: value,
						} ) );
					}
				},
				() => {
					if ( isCurrent ) {
						setKeys( ( current ) => ( {
							...current,
							[ name ]: false,
						} ) );
					}
				}
			);
		}
		return () => {
			isCurrent = false;
		};
	}, [] );

	const isKnown = PROVIDER_NAMES.every( ( name ) => keys[ name ] !== null );
	const connected = PROVIDER_NAMES.filter( ( name ) => keys[ name ] );
	const fallback = isKnown
		? getFallbackProvider( provider, connected )
		: null;

	// The assistant uses a provider that has an API key: the only one, or,
	// when the chosen provider's key was deleted, another one.
	useEffect( () => {
		if ( fallback ) {
			onChange( { provider: fallback } );
		}
	}, [ fallback, onChange ] );

	const providerItems = connected.map( ( name ) => ( {
		value: name,
		label: PROVIDERS[ name ].name,
	} ) );

	return (
		<Stack direction="column" gap="lg">
			{ PROVIDER_NAMES.map( ( name ) => (
				<AiProviderCard
					key={ name }
					provider={ name }
					hasKey={ keys[ name ] }
					model={ models[ name ] ?? '' }
					onKeyChange={ ( value ) =>
						setKeys( ( current ) => ( {
							...current,
							[ name ]: value,
						} ) )
					}
					onModelChange={ ( model ) => onModelChange( name, model ) }
				/>
			) ) }
			{ connected.length > 0 && (
				<Stack direction="column">
					<SelectControl
						size="compact"
						label={ __( 'Provider', 'mark-bricks' ) }
						description={
							connected.length > 1
								? __(
										'The AI Assistant uses this provider.',
										'mark-bricks'
									)
								: undefined
						}
						items={ providerItems }
						value={
							providerItems.find(
								( item ) => item.value === provider
							) ?? null
						}
						isItemEqualToValue={ ( a, b ) => a.value === b.value }
						// With one connected provider, there is nothing to
						// choose.
						disabled={ connected.length < 2 }
						onValueChange={ ( item ) => {
							if ( item && item.value !== provider ) {
								onChange( {
									provider: toProvider( item.value ),
								} );
							}
						} }
					/>
				</Stack>
			) }
			<TextareaControl
				label={ __( 'Custom instructions', 'mark-bricks' ) }
				description={ __(
					'Sent with every message to the AI Assistant. For example, the tone to write in, or what your documents are about.',
					'mark-bricks'
				) }
				rows={ 6 }
				value={ instructions }
				onValueChange={ ( value ) =>
					onChange( { instructions: value } )
				}
			/>
		</Stack>
	);
}
