/**
 * External dependencies
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invoke, openPreferences } = vi.hoisted( () => ( {
	invoke: vi.fn(),
	openPreferences: vi.fn(),
} ) );

vi.mock( '@tauri-apps/api/core', () => ( {
	invoke,
	Channel: class {
		onmessage: ( message: unknown ) => void = () => {};
	},
} ) );

vi.mock( '../components/preferences-modal/open', () => ( {
	openPreferences,
} ) );

/**
 * WordPress dependencies
 */
import { dispatch } from '@wordpress/data';
import { store as preferencesStore } from '@wordpress/preferences';

/**
 * Internal dependencies
 */
import { aiPlatform } from './platform';
import { DEFAULT_MODEL } from './anthropic';

/**
 * Sends a message, and resolves with the model of the request.
 */
async function modelOfRequest() {
	let model: unknown;
	invoke.mockImplementation(
		async ( command: string, args: { body: string } ) => {
			if ( command === 'ai_request' ) {
				model = JSON.parse( args.body ).model;
				throw { code: 'cancelled' };
			}
		}
	);
	await expect(
		aiPlatform.chat( {
			system: '',
			messages: [ { role: 'user', text: 'Hello' } ],
			onEvent: () => {},
			signal: new AbortController().signal,
		} )
	).rejects.toThrow();
	return model;
}

beforeEach( () => {
	invoke.mockReset();
	dispatch( preferencesStore ).set( 'mark-bricks', 'aiModel', '' );
} );

describe( 'aiPlatform', () => {
	it( 'uses the default model when none is chosen', async () => {
		expect( await modelOfRequest() ).toBe( DEFAULT_MODEL );
	} );

	it( 'uses the model chosen in the preferences', async () => {
		dispatch( preferencesStore ).set(
			'mark-bricks',
			'aiModel',
			'claude-sonnet-5-5'
		);
		expect( await modelOfRequest() ).toBe( 'claude-sonnet-5-5' );
	} );

	it( 'checks the API key', async () => {
		invoke.mockResolvedValue( true );
		await expect( aiPlatform.hasApiKey() ).resolves.toBe( true );
		expect( invoke ).toHaveBeenCalledWith( 'has_ai_api_key', {
			provider: 'anthropic',
		} );
	} );

	it( 'opens the preferences on the AI Assistant tab', () => {
		aiPlatform.openSettings!();
		expect( openPreferences ).toHaveBeenCalledWith( 'ai' );
	} );
} );
