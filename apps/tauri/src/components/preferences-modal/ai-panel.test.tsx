/**
 * External dependencies
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks';

/**
 * Internal dependencies
 */
import {
	AiPanel,
	getFallbackProvider,
	getModelItems,
	type AiSettings,
} from './ai-panel';
import type { AiProvider } from '../../ai/providers';

const MODELS = [
	{ id: 'claude-opus-5-5', displayName: 'Claude Opus 5.5' },
	{ id: 'claude-sonnet-5-5', displayName: 'Claude Sonnet 5.5' },
];

describe( 'getModelItems', () => {
	it( 'lists the default model first, by its name', () => {
		expect( getModelItems( MODELS, '', 'claude-opus-5-5' ) ).toEqual( [
			{ value: 'default', label: 'Default (Claude Opus 5.5)' },
			{ value: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
			{ value: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
		] );
	} );

	it( 'keeps a chosen model that is not listed', () => {
		expect( getModelItems( [], 'claude-old', 'claude-opus-5-5' ) ).toEqual(
			[
				{ value: 'default', label: 'Default (claude-opus-5-5)' },
				{ value: 'claude-old', label: 'claude-old' },
			]
		);
	} );
} );

describe( 'getFallbackProvider', () => {
	it( 'keeps a chosen provider that is connected', () => {
		expect(
			getFallbackProvider( 'openai', [ 'anthropic', 'openai' ] )
		).toBeNull();
	} );

	it( 'switches to a connected provider', () => {
		expect( getFallbackProvider( 'anthropic', [ 'openai' ] ) ).toBe(
			'openai'
		);
	} );

	it( 'keeps the chosen provider when none is connected', () => {
		expect( getFallbackProvider( 'openai', [] ) ).toBeNull();
	} );
} );

describe( 'AiPanel', () => {
	let container: HTMLDivElement;
	let root: Root;
	let savedKeys: Record< AiProvider, string | null >;
	const commands: Array< { command: string; provider?: string } > = [];
	const onChange = vi.fn();
	const onModelChange = vi.fn();

	beforeEach( () => {
		savedKeys = { anthropic: null, openai: null };
		commands.length = 0;
		onChange.mockReset();
		onModelChange.mockReset();
		mockIPC( ( command, args ) => {
			const payload = args as { key?: string; provider: AiProvider };
			commands.push( { command, provider: payload?.provider } );
			switch ( command ) {
				case 'has_ai_api_key':
					return savedKeys[ payload.provider ] !== null;
				case 'check_ai_api_key':
					if ( payload.key === 'sk-ant-invalid' ) {
						throw {
							code: 'http',
							status: 401,
							body: '{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}',
						};
					}
					return null;
				case 'save_ai_api_key':
					savedKeys[ payload.provider ] = payload.key ?? '';
					return null;
				case 'delete_ai_api_key':
					savedKeys[ payload.provider ] = null;
					return null;
				case 'list_ai_models':
					return payload.provider === 'anthropic' ? MODELS : [];
			}
		} );
		container = document.createElement( 'div' );
		document.body.append( container );
		root = createRoot( container );
	} );

	afterEach( () => {
		act( () => root.unmount() );
		container.remove();
		clearMocks();
	} );

	async function render( settings: Partial< AiSettings > = {} ) {
		await act( async () => {
			root.render(
				<AiPanel
					settings={ {
						provider: 'anthropic',
						models: {},
						instructions: '',
						...settings,
					} }
					onChange={ onChange }
					onModelChange={ onModelChange }
				/>
			);
		} );
	}

	function card( provider: AiProvider ) {
		return container.querySelectorAll(
			'.preferences-modal__provider-card'
		)[ provider === 'anthropic' ? 0 : 1 ] as HTMLElement;
	}

	function input( provider: AiProvider = 'anthropic' ) {
		return card( provider ).querySelector(
			'input[type="password"]'
		) as HTMLInputElement;
	}

	function button( label: string, provider: AiProvider = 'anthropic' ) {
		return [ ...card( provider ).querySelectorAll( 'button' ) ].find(
			( element ) => element.textContent === label
		);
	}

	function providerSelect() {
		return [ ...container.querySelectorAll( '[role="combobox"]' ) ].find(
			( element ) =>
				! element.closest( '.preferences-modal__provider-card' )
		) as HTMLElement | undefined;
	}

	async function typeKey( key: string, provider: AiProvider = 'anthropic' ) {
		await act( async () => {
			const setValue = Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				'value'
			)!.set!;
			setValue.call( input( provider ), key );
			input( provider ).dispatchEvent(
				new Event( 'input', { bubbles: true } )
			);
		} );
	}

	async function choose( combobox: HTMLElement, label: string ) {
		await act( async () => {
			combobox.click();
		} );
		const option = [
			...document.querySelectorAll( '[role="option"]' ),
		].find( ( element ) => element.textContent === label );
		await act( async () => {
			( option as HTMLElement ).click();
		} );
	}

	it( 'shows a card for each provider, with links to its API keys and usage', async () => {
		await render();
		expect( card( 'anthropic' ).textContent ).toContain( 'Anthropic' );
		expect( card( 'anthropic' ).textContent ).toContain( 'Not connected' );
		const links = ( provider: AiProvider ) =>
			Array.from( card( provider ).querySelectorAll( 'a' ), ( link ) =>
				link.getAttribute( 'href' )
			);
		expect( links( 'anthropic' ) ).toEqual( [
			'https://platform.claude.com/settings/keys',
			'https://platform.claude.com/usage',
		] );
		expect( links( 'openai' ) ).toEqual( [
			'https://platform.openai.com/api-keys',
			'https://platform.openai.com/usage',
		] );
		expect( card( 'openai' ).textContent ).toContain( 'OpenAI' );
		expect( card( 'openai' ).textContent ).toContain(
			'only sent to the OpenAI API.'
		);
		expect( input( 'openai' ).placeholder ).toBe( 'sk-…' );
	} );

	it( 'hides the provider without a connected provider', async () => {
		await render();
		expect( providerSelect() ).toBeUndefined();
		expect(
			commands.some( ( { command } ) => command === 'list_ai_models' )
		).toBe( false );
	} );

	it( 'saves the API key, then shows the connected model', async () => {
		await render();
		await typeKey( 'sk-ant-key' );
		await act( async () => {
			button( 'Save' )!.click();
		} );
		expect( savedKeys.anthropic ).toBe( 'sk-ant-key' );
		expect( input().value ).not.toContain( 'sk-ant' );
		expect( input().disabled ).toBe( true );
		expect( button( 'Delete' ) ).toBeDefined();
		expect( card( 'anthropic' ).textContent ).toContain( 'Connected' );
		expect( card( 'anthropic' ).textContent ).toContain(
			'Model: Claude Opus 5.5'
		);
		expect( card( 'openai' ).textContent ).toContain( 'Not connected' );
	} );

	it( 'does not save an API key the API refuses', async () => {
		await render();
		await typeKey( 'sk-ant-invalid' );
		await act( async () => {
			button( 'Save' )!.click();
		} );
		expect( savedKeys.anthropic ).toBeNull();
		expect( input().value ).toBe( 'sk-ant-invalid' );
		expect( container.textContent ).toContain(
			'This API key is not valid.'
		);
	} );

	it( 'ignores the models of a replaced API key', async () => {
		savedKeys.anthropic = 'sk-ant-old';
		const pending: Array< ( models: unknown ) => void > = [];
		mockIPC( ( command, args ) => {
			const payload = args as { key?: string; provider: AiProvider };
			switch ( command ) {
				case 'has_ai_api_key':
					return savedKeys[ payload.provider ] !== null;
				case 'check_ai_api_key':
					return null;
				case 'save_ai_api_key':
					savedKeys[ payload.provider ] = payload.key ?? '';
					return null;
				case 'delete_ai_api_key':
					savedKeys[ payload.provider ] = null;
					return null;
				case 'list_ai_models':
					return new Promise( ( resolve ) =>
						pending.push( resolve )
					);
			}
		} );
		await render();
		await act( async () => {
			button( 'Delete' )!.click();
		} );
		await typeKey( 'sk-ant-new' );
		await act( async () => {
			button( 'Save' )!.click();
		} );
		expect( pending ).toHaveLength( 2 );
		await act( async () => {
			pending[ 1 ]( [] );
		} );
		await act( async () => {
			pending[ 0 ]( MODELS );
		} );
		expect( container.textContent ).not.toContain( 'Loading the models' );
		const combobox =
			card( 'anthropic' ).querySelector( '[role="combobox"]' );
		await act( async () => {
			( combobox as HTMLElement ).click();
		} );
		expect( document.body.textContent ).not.toContain(
			'Claude Sonnet 5.5'
		);
	} );

	it( 'deletes the API key and forgets its model', async () => {
		savedKeys.anthropic = 'sk-ant-key';
		await render( {
			models: { anthropic: 'claude-sonnet-5-5', openai: 'gpt-6-mini' },
		} );
		expect( card( 'anthropic' ).textContent ).toContain(
			'Model: Claude Sonnet 5.5'
		);
		await act( async () => {
			button( 'Delete' )!.click();
		} );
		expect( savedKeys.anthropic ).toBeNull();
		expect( container.textContent ).toContain( 'The API key was deleted.' );
		expect( input().disabled ).toBe( false );
		expect( input().value ).toBe( '' );
		expect( onModelChange ).toHaveBeenCalledWith( 'anthropic', '' );
		expect( card( 'anthropic' ).textContent ).not.toContain( 'Model' );
		expect( providerSelect() ).toBeUndefined();
	} );

	it( 'changes the model of its provider', async () => {
		savedKeys.anthropic = 'sk-ant-key';
		await render( { models: { openai: 'gpt-6-mini' } } );
		await choose(
			card( 'anthropic' ).querySelector(
				'[role="combobox"]'
			) as HTMLElement,
			'Claude Sonnet 5.5'
		);
		expect( onModelChange ).toHaveBeenCalledWith(
			'anthropic',
			'claude-sonnet-5-5'
		);
	} );

	it( 'uses the only connected provider', async () => {
		savedKeys.openai = 'sk-key';
		await render();
		expect( onChange ).toHaveBeenCalledWith( { provider: 'openai' } );
		expect( providerSelect()?.hasAttribute( 'data-disabled' ) ).toBe(
			true
		);
	} );

	it( 'chooses among the connected providers', async () => {
		savedKeys.anthropic = 'sk-ant-key';
		savedKeys.openai = 'sk-key';
		await render();
		expect( onChange ).not.toHaveBeenCalled();
		expect( providerSelect()?.hasAttribute( 'data-disabled' ) ).toBe(
			false
		);
		await choose( providerSelect()!, 'OpenAI' );
		expect( onChange ).toHaveBeenCalledWith( { provider: 'openai' } );
	} );

	it( 'falls back to another connected provider when the key of the chosen one is deleted', async () => {
		savedKeys.anthropic = 'sk-ant-key';
		savedKeys.openai = 'sk-key';
		await render( { provider: 'openai' } );
		expect( onChange ).not.toHaveBeenCalled();
		await act( async () => {
			button( 'Delete', 'openai' )!.click();
		} );
		expect( onChange ).toHaveBeenCalledWith( { provider: 'anthropic' } );
	} );

	it( 'saves the custom instructions', async () => {
		await render( { instructions: 'Be brief.' } );
		const textarea = container.querySelector( 'textarea' )!;
		expect( textarea.value ).toBe( 'Be brief.' );
		await act( async () => {
			const setValue = Object.getOwnPropertyDescriptor(
				HTMLTextAreaElement.prototype,
				'value'
			)!.set!;
			setValue.call( textarea, 'Write in English.' );
			textarea.dispatchEvent( new Event( 'input', { bubbles: true } ) );
		} );
		expect( onChange ).toHaveBeenCalledWith( {
			instructions: 'Write in English.',
		} );
	} );
} );
