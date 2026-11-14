/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { filterChatModels } from './models';

describe( 'filterChatModels', () => {
	it( 'keeps only the models that can chat', () => {
		const ids = [
			'gpt-6-astra',
			'gpt-6.1-sol',
			'o4-mini',
			'gpt-4o-mini-tts',
			'gpt-realtime-2',
			'gpt-image-2',
			'gpt-4o-transcribe',
			'gpt-4o-search-preview',
			'text-embedding-3-large',
			'omni-moderation-latest',
			'gpt-3.5-turbo',
			'dall-e-3',
			'whisper-1',
		];
		expect(
			filterChatModels(
				ids.map( ( id ) => ( { id, displayName: id } ) )
			).map( ( { id } ) => id )
		).toEqual( [ 'gpt-6-astra', 'gpt-6.1-sol', 'o4-mini' ] );
	} );
} );
