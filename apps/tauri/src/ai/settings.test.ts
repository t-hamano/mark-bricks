/**
 * External dependencies
 */
import { afterEach, describe, expect, it } from 'vitest';
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks';

/**
 * Internal dependencies
 */
import { listModels } from './settings';

afterEach( () => {
	clearMocks();
} );

describe( 'listModels', () => {
	it( 'lists the models of the Anthropic API key', async () => {
		const models = [
			{ id: 'claude-opus-5-5', displayName: 'Claude Opus 5.5' },
		];
		let provider: unknown;
		mockIPC( ( command, args ) => {
			if ( command === 'list_ai_models' ) {
				provider = ( args as { provider: string } ).provider;
				return models;
			}
		} );
		await expect( listModels( 'anthropic' ) ).resolves.toEqual( models );
		expect( provider ).toBe( 'anthropic' );
	} );

	it( 'lists only the chat models of the OpenAI API key', async () => {
		let provider: unknown;
		mockIPC( ( command, args ) => {
			if ( command === 'list_ai_models' ) {
				provider = ( args as { provider: string } ).provider;
				return [
					{ id: 'gpt-6-astra', displayName: 'gpt-6-astra' },
					{
						id: 'text-embedding-3-large',
						displayName: 'text-embedding-3-large',
					},
					{
						id: 'gpt-realtime-2',
						displayName: 'gpt-realtime-2',
					},
				];
			}
		} );
		await expect( listModels( 'openai' ) ).resolves.toEqual( [
			{ id: 'gpt-6-astra', displayName: 'gpt-6-astra' },
		] );
		expect( provider ).toBe( 'openai' );
	} );

	it( 'describes a failed request for the user', async () => {
		mockIPC( () => {
			throw {
				code: 'http',
				status: 401,
				body: '{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}',
			};
		} );
		await expect( listModels( 'anthropic' ) ).rejects.toThrow(
			'The API key is not valid. Check it in the settings.'
		);
	} );
} );
