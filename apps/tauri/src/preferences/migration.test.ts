/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { migrate } from './migration';

describe( 'migrate', () => {
	it( 'keeps the chosen model for the chosen provider', () => {
		expect(
			migrate( 2, {
				'mark-bricks': {
					aiProvider: 'openai',
					aiModel: 'gpt-6-mini',
				},
			} )
		).toEqual( {
			'mark-bricks': {
				aiProvider: 'openai',
				aiModels: { openai: 'gpt-6-mini' },
			},
		} );
	} );

	it( 'gives the model to Anthropic when no provider was chosen', () => {
		expect(
			migrate( 2, { 'mark-bricks': { aiModel: 'claude-sonnet-5-5' } } )
		).toEqual( {
			'mark-bricks': { aiModels: { anthropic: 'claude-sonnet-5-5' } },
		} );
	} );

	it( 'drops the default model', () => {
		expect(
			migrate( 2, {
				'mark-bricks': { aiProvider: 'anthropic', aiModel: '' },
			} )
		).toEqual( { 'mark-bricks': { aiProvider: 'anthropic' } } );
	} );
} );
