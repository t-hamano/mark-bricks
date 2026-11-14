/**
 * External dependencies
 */
import type { AiChatRequest } from '@mark-bricks/editor';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { toEdit } from '../edit-tool';
import { createSseParser } from '../sse';
import type { AiTransport } from '../transport-type';
import { OpenAiError } from './errors';
import { createResponseStream, type StreamedResponse } from './response-stream';
import {
	buildRequestBody,
	DEFAULT_MODEL,
	EDIT_TOOL_NAME,
	toEditCallItems,
	toInputItems,
	type InputItem,
	type RequestBody,
} from './request';

export type OpenAiChatOptions = {
	transport: AiTransport< RequestBody >;
	/**
	 * Defaults to `DEFAULT_MODEL`.
	 */
	model?: string;
};

/**
 * Creates the `chat` function of `Platform.ai` for the OpenAI Responses
 * API.
 *
 * When the model edits the selection, the edit is reported, and the
 * conversation continues in a second request so that the model can say
 * what it changed. That request does not allow another edit.
 *
 * @param options           The transport, and the model.
 * @param options.transport
 * @param options.model
 */
export function createOpenAiChat( {
	transport,
	model = DEFAULT_MODEL,
}: OpenAiChatOptions ) {
	const streamResponse = async (
		body: RequestBody,
		onText: ( text: string ) => void,
		signal: AbortSignal
	) => {
		const response = createResponseStream( onText );
		const parser = createSseParser( response.handle );
		await transport( body, parser.push, signal );
		parser.end();
		return response.finish();
	};

	return async function chat( {
		system,
		messages,
		onEvent,
		signal,
	}: AiChatRequest ): Promise< void > {
		const input = toInputItems( messages );
		let hasText = false;
		const onText = ( text: string ) => {
			hasText = true;
			onEvent( { type: 'text', text } );
		};

		const first = await streamResponse(
			buildRequestBody( { model, system, input } ),
			onText,
			signal
		);
		checkResponse( first );

		const call = first.functionCalls.find(
			( item ) => item.name === EDIT_TOOL_NAME
		);
		if ( ! call ) {
			return;
		}
		const edit = toEdit( parseArguments( call.arguments ) );
		if ( ! edit ) {
			throw new OpenAiError(
				__(
					'The edit from the model could not be read.',
					'mark-bricks'
				)
			);
		}
		onEvent( { type: 'edit', edit } );

		if ( signal.aborted ) {
			throw new DOMException( 'The answer was stopped.', 'AbortError' );
		}

		// Separate the text before the edit from the text after it.
		let needsSeparator = hasText;
		const { output } = toEditCallItems( edit, call.call_id );
		// The answer's items go back as the API sent them, including the
		// reasoning that led to the edit.
		const continuation: InputItem[] = [
			...input,
			...first.outputItems,
			output,
		];
		const second = await streamResponse(
			buildRequestBody( {
				model,
				system,
				input: continuation,
				allowEditTool: false,
			} ),
			( text ) => {
				if ( needsSeparator ) {
					needsSeparator = false;
					onText( '\n\n' );
				}
				onText( text );
			},
			signal
		);
		checkResponse( second );
	};
}

/**
 * Throws when the answer did not end normally.
 *
 * @param response The streamed response.
 */
function checkResponse( response: StreamedResponse ) {
	if ( response.refused || response.incompleteReason === 'content_filter' ) {
		throw new OpenAiError(
			__( 'The model declined to answer this request.', 'mark-bricks' ),
			'refusal'
		);
	}
	if ( response.incompleteReason === 'max_output_tokens' ) {
		throw new OpenAiError(
			__(
				'The answer was cut off because it reached the length limit.',
				'mark-bricks'
			),
			'max_tokens'
		);
	}
}

/**
 * Parses a function call's arguments.
 *
 * @param json The arguments' JSON.
 * @return The arguments, or `undefined` when the JSON is not valid.
 */
function parseArguments( json: string ): unknown {
	try {
		return JSON.parse( json );
	} catch {
		return undefined;
	}
}
