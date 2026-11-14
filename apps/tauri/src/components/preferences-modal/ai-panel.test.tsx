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
import { AiPanel, getModelItems } from './ai-panel';
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

describe( 'AiPanel', () => {
	let container: HTMLDivElement;
	let root: Root;
	let savedKey: string | null;
	const commands: string[] = [];
	const providers: unknown[] = [];

	beforeEach( () => {
		savedKey = null;
		commands.length = 0;
		providers.length = 0;
		onChange.mockReset();
		mockIPC( ( command, args ) => {
			commands.push( command );
			const payload = args as { key?: string; provider?: string };
			providers.push( payload.provider );
			switch ( command ) {
				case 'has_ai_api_key':
					return savedKey !== null;
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
					savedKey = payload.key ?? '';
					return null;
				case 'delete_ai_api_key':
					savedKey = null;
					return null;
				case 'list_ai_models':
					return MODELS;
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

	const onChange = vi.fn();

	async function render( provider: AiProvider = 'anthropic' ) {
		await act( async () => {
			root.render(
				<AiPanel
					settings={ { provider, model: '' } }
					onChange={ onChange }
				/>
			);
		} );
	}

	function input() {
		return container.querySelector(
			'input[type="password"]'
		) as HTMLInputElement;
	}

	function button( label: string ) {
		return [ ...container.querySelectorAll( 'button' ) ].find(
			( element ) => element.textContent === label
		);
	}

	it( 'does not load the models without an API key', async () => {
		await render();
		expect( container.textContent ).not.toContain( 'Model' );
		expect( commands ).not.toContain( 'list_ai_models' );
	} );

	it( 'saves the API key, then loads the models', async () => {
		await render();
		await act( async () => {
			const setValue = Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				'value'
			)!.set!;
			setValue.call( input(), 'sk-ant-key' );
			input().dispatchEvent( new Event( 'input', { bubbles: true } ) );
		} );
		await act( async () => {
			button( 'Save' )!.click();
		} );
		expect( savedKey ).toBe( 'sk-ant-key' );
		expect( input().value ).not.toContain( 'sk-ant' );
		expect( input().disabled ).toBe( true );
		expect( button( 'Delete' ) ).toBeDefined();
		expect( commands ).toContain( 'list_ai_models' );
	} );

	it( 'does not save an API key the API refuses', async () => {
		await render();
		await act( async () => {
			const setValue = Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				'value'
			)!.set!;
			setValue.call( input(), 'sk-ant-invalid' );
			input().dispatchEvent( new Event( 'input', { bubbles: true } ) );
		} );
		await act( async () => {
			button( 'Save' )!.click();
		} );
		expect( savedKey ).toBeNull();
		expect( input().value ).toBe( 'sk-ant-invalid' );
		expect( container.textContent ).toContain(
			'This API key is not valid.'
		);
	} );

	it( 'ignores the models of a replaced API key', async () => {
		savedKey = 'sk-ant-old';
		const pending: Array< ( models: unknown ) => void > = [];
		mockIPC( ( command, args ) => {
			switch ( command ) {
				case 'has_ai_api_key':
					return savedKey !== null;
				case 'check_ai_api_key':
					return null;
				case 'save_ai_api_key':
					savedKey = ( args as { key: string } ).key;
					return null;
				case 'delete_ai_api_key':
					savedKey = null;
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
		await act( async () => {
			const setValue = Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				'value'
			)!.set!;
			setValue.call( input(), 'sk-ant-new' );
			input().dispatchEvent( new Event( 'input', { bubbles: true } ) );
		} );
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
		const combobox = [
			...container.querySelectorAll( '[role="combobox"]' ),
		].pop();
		await act( async () => {
			( combobox as HTMLElement ).click();
		} );
		expect( document.body.textContent ).not.toContain(
			'Claude Sonnet 5.5'
		);
	} );

	it( 'deletes the API key', async () => {
		savedKey = 'sk-ant-key';
		await render();
		await act( async () => {
			button( 'Delete' )!.click();
		} );
		expect( savedKey ).toBeNull();
		expect( container.textContent ).toContain( 'The API key was deleted.' );
		expect( input().disabled ).toBe( false );
		expect( input().value ).toBe( '' );
		expect( onChange ).toHaveBeenCalledWith( { model: '' } );
		expect( container.textContent ).not.toContain( 'Model' );
	} );

	it( 'uses the key of the chosen provider', async () => {
		await render( 'openai' );
		expect( container.textContent ).toContain( 'OpenAI API key' );
		expect( container.textContent ).toContain(
			'only sent to the OpenAI API.'
		);
		expect( input().placeholder ).toBe( 'sk-…' );
		expect( commands ).toContain( 'has_ai_api_key' );
		expect( new Set( providers ) ).toEqual( new Set( [ 'openai' ] ) );
	} );

	it( 'resets the model when another provider is chosen', async () => {
		await render();
		const combobox = container.querySelector( '[role="combobox"]' );
		await act( async () => {
			( combobox as HTMLElement ).click();
		} );
		const option = [
			...document.querySelectorAll( '[role="option"]' ),
		].find( ( element ) => element.textContent === 'OpenAI' );
		await act( async () => {
			( option as HTMLElement ).click();
		} );
		expect( onChange ).toHaveBeenCalledWith( {
			provider: 'openai',
			model: '',
		} );
	} );

	it( 'does not switch providers while the key is deleted', async () => {
		savedKey = 'sk-ant-key';
		mockIPC( ( command ) => {
			switch ( command ) {
				case 'has_ai_api_key':
					return true;
				case 'list_ai_models':
					return MODELS;
				case 'delete_ai_api_key':
					return new Promise( () => {} );
			}
		} );
		await render();
		const providerSelect = () =>
			container.querySelector( '[role="combobox"]' ) as HTMLElement;
		expect( providerSelect().hasAttribute( 'data-disabled' ) ).toBe(
			false
		);
		await act( async () => {
			button( 'Delete' )!.click();
		} );
		expect( providerSelect().hasAttribute( 'data-disabled' ) ).toBe( true );
	} );
} );
