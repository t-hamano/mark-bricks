/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import {
	conversationReducer,
	createConversation,
	getLastSeenDocument,
	toAiMessages,
	type AssistantChatMessage,
	type Conversation,
	type ConversationAction,
} from './conversation';

const EDIT = { action: 'replace' as const, markdown: 'New.\n' };

function run( ...actions: ConversationAction[] ): Conversation {
	return actions.reduce( conversationReducer, createConversation() );
}

describe( 'conversationReducer', () => {
	it( 'adds the question and streams the answer into it', () => {
		const { messages } = run(
			{ type: 'START', text: 'Rewrite this' },
			{ type: 'APPEND_TEXT', text: 'Done' },
			{ type: 'APPEND_TEXT', text: '.' },
			{ type: 'EDIT', edit: EDIT, applied: true },
			{ type: 'FINISH', status: 'done' }
		);
		expect( messages ).toMatchObject( [
			{ role: 'user', text: 'Rewrite this' },
			{
				role: 'assistant',
				text: 'Done.',
				edit: EDIT,
				editStatus: 'applied',
				status: 'done',
			},
		] );
	} );

	it( 'shows what the model does until its text arrives', () => {
		const actions: ConversationAction[] = [
			{ type: 'START', text: 'Rewrite this' },
			{ type: 'ACTIVITY', activity: 'thinking' },
			{ type: 'APPEND_TEXT', text: 'Sure.' },
			{ type: 'ACTIVITY', activity: 'editing' },
			{ type: 'EDIT', edit: EDIT, applied: true },
			{ type: 'APPEND_TEXT', text: 'Done.' },
			{ type: 'FINISH', status: 'done' },
		];
		const activities = actions.map( ( _, index ) => {
			const answer = run( ...actions.slice( 0, index + 1 ) )
				.messages[ 1 ] as AssistantChatMessage;
			return answer.activity;
		} );
		expect( activities ).toEqual( [
			'waiting',
			'thinking',
			undefined,
			'editing',
			'waiting',
			undefined,
			undefined,
		] );
	} );

	it( 'adds up the tokens of the answer’s requests', () => {
		const { messages } = run(
			{ type: 'START', text: 'Rewrite this' },
			{
				type: 'USAGE',
				usage: { inputTokens: 1200, outputTokens: 80 },
			},
			{ type: 'EDIT', edit: EDIT, applied: true },
			{
				type: 'USAGE',
				usage: { inputTokens: 1300, outputTokens: 20 },
			},
			{ type: 'FINISH', status: 'done' }
		);
		expect( messages[ 1 ] ).toMatchObject( {
			usage: { inputTokens: 2500, outputTokens: 100 },
		} );
	} );

	it( 'adds up the tokens read from the cache when reported', () => {
		const { messages } = run(
			{ type: 'START', text: 'Rewrite this' },
			{
				type: 'USAGE',
				usage: {
					inputTokens: 1200,
					cachedInputTokens: 1000,
					outputTokens: 80,
				},
			},
			{
				type: 'USAGE',
				usage: { inputTokens: 1300, outputTokens: 20 },
			},
			{ type: 'FINISH', status: 'done' }
		);
		expect( messages[ 1 ] ).toMatchObject( {
			usage: {
				inputTokens: 2500,
				cachedInputTokens: 1000,
				outputTokens: 100,
			},
		} );
		const unreported = run(
			{ type: 'START', text: 'Hi' },
			{ type: 'USAGE', usage: { inputTokens: 10, outputTokens: 5 } }
		).messages[ 1 ] as AssistantChatMessage;
		expect( unreported.usage ).not.toHaveProperty( 'cachedInputTokens' );
	} );

	it( 'ignores events after the answer finished', () => {
		const { messages } = run(
			{ type: 'START', text: 'Hi' },
			{ type: 'FINISH', status: 'stopped' },
			{ type: 'APPEND_TEXT', text: 'Late' },
			{ type: 'FINISH', status: 'done' }
		);
		expect( messages[ 1 ] ).toMatchObject( {
			text: '',
			status: 'stopped',
		} );
	} );

	it( 'starts a new conversation on reset', () => {
		const before = run( { type: 'START', text: 'Hi' } );
		const after = conversationReducer( before, { type: 'RESET' } );
		expect( after.messages ).toEqual( [] );
		expect( after.id ).not.toBe( before.id );
	} );
} );

describe( 'toAiMessages', () => {
	it( 'sends applied edits, and leaves out failed exchanges and empty answers', () => {
		const { messages } = run(
			{ type: 'START', text: 'One' },
			{ type: 'APPEND_TEXT', text: 'Edited.' },
			{ type: 'EDIT', edit: EDIT, applied: true },
			{ type: 'FINISH', status: 'done' },
			{ type: 'START', text: 'Two' },
			{ type: 'FINISH', status: 'error', error: 'Failed' },
			{ type: 'START', text: 'Three' },
			{ type: 'FINISH', status: 'stopped' },
			{ type: 'START', text: 'Four' },
			{ type: 'APPEND_TEXT', text: 'Could not edit.' },
			{ type: 'EDIT', edit: EDIT, applied: false },
			{ type: 'FINISH', status: 'done' }
		);
		expect( toAiMessages( messages ) ).toEqual( [
			{ role: 'user', text: 'One' },
			{ role: 'assistant', text: 'Edited.', edit: EDIT },
			{ role: 'user', text: 'Three' },
			{ role: 'user', text: 'Four' },
			{ role: 'assistant', text: 'Could not edit.' },
		] );
	} );
} );

describe( 'document context', () => {
	const snapshot = ( document: string ) => ( {
		editorMode: 'visual',
		document,
	} );

	it( 'sends the context before the message, as it was sent', () => {
		const { messages } = run(
			{ type: 'START', text: 'Rewrite this', context: '<document>' },
			{ type: 'APPEND_TEXT', text: 'Done.' },
			{ type: 'FINISH', status: 'done' }
		);
		expect( toAiMessages( messages )[ 0 ] ).toEqual( {
			role: 'user',
			text: '<document>\n\nRewrite this',
		} );
	} );

	it( 'returns the document when the last answer ended', () => {
		const { messages } = run(
			{ type: 'START', text: 'One', context: 'A' },
			{ type: 'APPEND_TEXT', text: 'Done.' },
			{
				type: 'FINISH',
				status: 'done',
				documentAfter: snapshot( 'First.\n' ),
			},
			{ type: 'START', text: 'Two', context: 'B' },
			{
				type: 'FINISH',
				status: 'stopped',
				documentAfter: snapshot( 'Second.\n' ),
			}
		);
		expect( getLastSeenDocument( messages, 'visual' ) ).toBe( 'Second.\n' );
	} );

	it( 'skips an exchange whose answer failed', () => {
		const { messages } = run(
			{ type: 'START', text: 'One', context: 'A' },
			{ type: 'APPEND_TEXT', text: 'Done.' },
			{
				type: 'FINISH',
				status: 'done',
				documentAfter: snapshot( 'First.\n' ),
			},
			{ type: 'START', text: 'Two', context: 'B' },
			{ type: 'FINISH', status: 'error', error: 'Failed' }
		);
		expect( getLastSeenDocument( messages, 'visual' ) ).toBe( 'First.\n' );
	} );

	it( 'returns null without a document from the same editor mode', () => {
		const { messages } = run(
			{ type: 'START', text: 'One', context: 'A' },
			{
				type: 'FINISH',
				status: 'done',
				documentAfter: snapshot( 'First.\n' ),
			}
		);
		expect( getLastSeenDocument( messages, 'text' ) ).toBeNull();
		expect( getLastSeenDocument( [], 'visual' ) ).toBeNull();
		expect(
			getLastSeenDocument(
				run(
					{ type: 'START', text: 'One' },
					{ type: 'FINISH', status: 'done' }
				).messages,
				'visual'
			)
		).toBeNull();
	} );
} );
