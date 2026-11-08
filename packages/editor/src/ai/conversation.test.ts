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
