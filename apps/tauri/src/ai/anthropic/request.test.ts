/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { buildRequestBody, toMessageParams } from './request';

describe( 'toMessageParams', () => {
	it( 'converts text messages', () => {
		expect(
			toMessageParams( [
				{ role: 'user', text: 'Hi' },
				{ role: 'assistant', text: 'Hello' },
				{ role: 'user', text: 'Shorter' },
			] )
		).toEqual( [
			{ role: 'user', content: [ { type: 'text', text: 'Hi' } ] },
			{ role: 'assistant', content: [ { type: 'text', text: 'Hello' } ] },
			{ role: 'user', content: [ { type: 'text', text: 'Shorter' } ] },
		] );
	} );

	it( 'turns an edit into a tool use and its result before the text', () => {
		const edit = { action: 'replace' as const, markdown: '# Title' };
		expect(
			toMessageParams( [
				{ role: 'user', text: 'Add a title' },
				{ role: 'assistant', text: 'Added a title.', edit },
				{ role: 'user', text: 'Thanks' },
			] )
		).toEqual( [
			{
				role: 'user',
				content: [ { type: 'text', text: 'Add a title' } ],
			},
			{
				role: 'assistant',
				content: [
					{
						type: 'tool_use',
						id: 'toolu_history_1',
						name: 'edit_document',
						input: { ...edit, find: '' },
					},
				],
			},
			{
				role: 'user',
				content: [
					{
						type: 'tool_result',
						tool_use_id: 'toolu_history_1',
						content: 'The edit was applied.',
					},
				],
			},
			{
				role: 'assistant',
				content: [ { type: 'text', text: 'Added a title.' } ],
			},
			{ role: 'user', content: [ { type: 'text', text: 'Thanks' } ] },
		] );
	} );

	it( 'puts the result of an edit without text in the next user message', () => {
		const edit = { action: 'insert_after' as const, markdown: 'More' };
		expect(
			toMessageParams( [
				{ role: 'user', text: 'Continue' },
				{ role: 'assistant', text: '', edit },
				{ role: 'user', text: 'Again' },
			] ).slice( 1 )
		).toEqual( [
			{
				role: 'assistant',
				content: [
					{
						type: 'tool_use',
						id: 'toolu_history_1',
						name: 'edit_document',
						input: { ...edit, find: '' },
					},
				],
			},
			{
				role: 'user',
				content: [
					{
						type: 'tool_result',
						tool_use_id: 'toolu_history_1',
						content: 'The edit was applied.',
					},
					{ type: 'text', text: 'Again' },
				],
			},
		] );
	} );
} );

describe( 'buildRequestBody', () => {
	const base = { model: 'claude-opus-5-5', system: 'S', messages: [] };

	it( 'builds a streamed request with the edit tool', () => {
		const body = buildRequestBody( base );
		expect( body ).toMatchObject( {
			model: 'claude-opus-5-5',
			stream: true,
			system: [
				{
					type: 'text',
					text: 'S',
					cache_control: { type: 'ephemeral' },
				},
			],
			tool_choice: { type: 'auto', disable_parallel_tool_use: true },
			fallbacks: 'default',
		} );
		expect( body.tools ).toEqual( [
			expect.objectContaining( { name: 'edit_document', strict: true } ),
		] );
	} );

	it( 'leaves out an empty system prompt', () => {
		expect( buildRequestBody( { ...base, system: '' } ).system ).toEqual(
			[]
		);
	} );

	it( 'keeps the tool but forbids calling it when edits are not allowed', () => {
		const body = buildRequestBody( { ...base, allowEditTool: false } );
		expect( body.tool_choice ).toEqual( { type: 'none' } );
		expect( body.tools ).toEqual( buildRequestBody( base ).tools );
	} );
} );
