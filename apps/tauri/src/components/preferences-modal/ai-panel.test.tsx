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

const MODELS = [
	{ id: 'claude-opus-5-5', displayName: 'Claude Opus 5.5' },
	{ id: 'claude-sonnet-5-5', displayName: 'Claude Sonnet 5.5' },
];

describe( 'getModelItems', () => {
	it( 'lists the default model first, by its name', () => {
		expect( getModelItems( MODELS, '' ) ).toEqual( [
			{ value: '', label: 'Default (Claude Opus 5.5)' },
			{ value: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
			{ value: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
		] );
	} );

	it( 'keeps a chosen model that is not listed', () => {
		expect( getModelItems( [], 'claude-old' ) ).toEqual( [
			{ value: '', label: 'Default (claude-opus-5-5)' },
			{ value: 'claude-old', label: 'claude-old' },
		] );
	} );
} );

describe( 'AiPanel', () => {
	let container: HTMLDivElement;
	let root: Root;
	let savedKey: string | null;
	const commands: string[] = [];

	beforeEach( () => {
		savedKey = null;
		commands.length = 0;
		mockIPC( ( command, args ) => {
			commands.push( command );
			const payload = args as { key?: string };
			switch ( command ) {
				case 'has_ai_api_key':
					return savedKey !== null;
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

	async function render() {
		await act( async () => {
			root.render(
				<AiPanel settings={ { model: '' } } onChange={ vi.fn() } />
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
		expect( container.textContent ).toContain(
			'Save an API key to choose a model.'
		);
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
		expect( input().value ).toBe( '' );
		expect( container.textContent ).toContain( 'An API key is saved.' );
		expect( commands ).toContain( 'list_ai_models' );
	} );

	it( 'deletes the API key', async () => {
		savedKey = 'sk-ant-key';
		await render();
		await act( async () => {
			button( 'Delete API key' )!.click();
		} );
		expect( savedKey ).toBeNull();
		expect( container.textContent ).toContain( 'The API key was deleted.' );
	} );
} );
