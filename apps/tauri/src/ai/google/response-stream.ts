/**
 * External dependencies
 */
import type { AiActivity, AiUsage } from '@mark-bricks/editor';

/**
 * Internal dependencies
 */
import {
	connectionClosedError,
	lengthLimitError,
	refusalError,
} from '../error';
import type { ProviderAnswer } from '../provider';
import { createStreamError, type ApiError } from './errors';
import {
	EDIT_TOOL_NAME,
	toEditResponse,
	type FunctionCall,
	type Part,
} from './request';

type StreamChunk = {
	candidates?: {
		content?: { parts?: Part[] };
		finishReason?: string;
	}[];
	promptFeedback?: { blockReason?: string };
	/**
	 * The counts so far. The prompt counts the cached tokens too, and the
	 * thoughts are billed as output.
	 */
	usageMetadata?: {
		promptTokenCount?: number;
		candidatesTokenCount?: number;
		thoughtsTokenCount?: number;
	};
	error?: ApiError;
};

/**
 * The reasons an answer ends that mean the model declined, or was stopped
 * for what it was asked or wrote.
 */
const REFUSAL_REASONS = [
	'SAFETY',
	'RECITATION',
	'BLOCKLIST',
	'PROHIBITED_CONTENT',
	'SPII',
	'IMAGE_SAFETY',
];

/**
 * The reasons an answer ends with a call of the edit tool that could not be
 * read.
 */
const MALFORMED_CALL_REASONS = [
	'MALFORMED_FUNCTION_CALL',
	'UNEXPECTED_TOOL_CALL',
];

/**
 * Whether two pieces of the answer's text can be sent back as one part.
 * Parts with a thought signature stay as they came.
 *
 * @param last The part before.
 * @param part The new part.
 */
function canJoin( last: Part | undefined, part: Part ) {
	return (
		last !== undefined &&
		typeof last.text === 'string' &&
		Object.keys( last ).length === 1 &&
		typeof part.text === 'string' &&
		Object.keys( part ).length === 1
	);
}

/**
 * Reads a streamed Gemini API answer. See `AiProviderAdapter.readAnswer`.
 *
 * @param onText     Called with each piece of the answer's text.
 * @param onActivity Called when the model starts to think, or calls the
 *                   edit tool.
 */
export function readAnswer(
	onText: ( text: string ) => void,
	onActivity: ( activity: AiActivity ) => void = () => {}
) {
	// The answer's parts, as the API sent them, to be sent back with the
	// edit's response. The thoughts are left out, but not their signatures.
	const parts: Part[] = [];
	let editCall: FunctionCall | undefined;
	let finishReason: string | undefined;
	let blocked = false;
	let usage: AiUsage | undefined;

	const addPart = ( part: Part ) => {
		if ( part.thought ) {
			onActivity( 'thinking' );
			if ( part.thoughtSignature ) {
				parts.push( part );
			}
			return;
		}
		if ( part.functionCall ) {
			// One edit per answer, since the selection changes after an
			// edit. The API cannot be told to call one function at a time,
			// so other calls are left out: each call sent back needs its
			// response.
			if ( part.functionCall.name === EDIT_TOOL_NAME && ! editCall ) {
				editCall = part.functionCall;
				onActivity( 'editing' );
				parts.push( part );
			}
			return;
		}
		if ( typeof part.text === 'string' ) {
			if ( part.text ) {
				onText( part.text );
			} else if ( ! part.thoughtSignature ) {
				return;
			}
			const last = parts[ parts.length - 1 ];
			if ( canJoin( last, part ) ) {
				last.text += part.text;
				return;
			}
		}
		parts.push( { ...part } );
	};

	const handle = ( data: unknown ) => {
		const chunk = data as StreamChunk;
		if ( chunk.error ) {
			throw createStreamError( chunk.error );
		}
		const counts = chunk.usageMetadata;
		if ( counts ) {
			usage = {
				inputTokens: counts.promptTokenCount ?? 0,
				outputTokens:
					( counts.candidatesTokenCount ?? 0 ) +
					( counts.thoughtsTokenCount ?? 0 ),
			};
		}
		if ( chunk.promptFeedback?.blockReason ) {
			blocked = true;
		}
		const candidate = chunk.candidates?.[ 0 ];
		candidate?.content?.parts?.forEach( addPart );
		if ( candidate?.finishReason ) {
			finishReason = candidate.finishReason;
		}
	};

	const finish = (): ProviderAnswer => {
		if ( blocked || REFUSAL_REASONS.includes( finishReason ?? '' ) ) {
			throw refusalError();
		}
		if ( ! finishReason ) {
			throw connectionClosedError();
		}
		if ( finishReason === 'MAX_TOKENS' ) {
			throw lengthLimitError();
		}
		if ( ! editCall ) {
			if ( MALFORMED_CALL_REASONS.includes( finishReason ) ) {
				return {
					editCall: { input: undefined },
					continuation: [],
					usage,
				};
			}
			return { continuation: [], usage };
		}
		return {
			editCall: { input: editCall.args },
			continuation: [
				{ role: 'model', parts },
				toEditResponse( editCall ),
			],
			usage,
		};
	};

	return { handle, finish };
}
