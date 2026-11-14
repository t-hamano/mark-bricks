/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { filterChatModels } from './models';

describe( 'filterChatModels', () => {
	it( 'keeps only the models that can chat, newest first', () => {
		const ids = [
			'gemini-2.5-flash',
			'gemini-3.6-flash',
			'gemini-3.1-pro-preview',
			'gemini-3-flash-preview',
			'gemini-4-argon',
			'gemini-3.5-flash-lite',
			'gemini-2.0-flash',
			'gemini-1.5-pro',
			'gemini-flash-latest',
			'gemini-2.5-flash-preview-tts',
			'gemini-3.1-flash-image-preview',
			'gemini-2.5-flash-native-audio-preview',
			'gemini-live-2.5-flash',
			'gemini-robotics-er-1.5-preview',
			'gemini-2.5-computer-use-preview',
			'gemini-embedding-001',
			'gemma-4-27b-it',
			'imagen-4.0-generate-001',
		];
		expect(
			filterChatModels(
				ids.map( ( id ) => ( { id, displayName: id } ) )
			).map( ( { id } ) => id )
		).toEqual( [
			'gemini-4-argon',
			'gemini-3.6-flash',
			'gemini-3.5-flash-lite',
			'gemini-3.1-pro-preview',
			'gemini-3-flash-preview',
			'gemini-2.5-flash',
		] );
	} );
} );
