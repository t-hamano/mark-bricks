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
