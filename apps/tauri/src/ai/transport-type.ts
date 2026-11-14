/**
 * Sends a request to the provider's API and passes the response's body to
 * `onChunk` as it arrives. Resolves when the response ends.
 *
 * When the response fails with an HTTP status, rejects with the error the
 * provider's `createHttpError` builds. When `signal` is aborted, rejects
 * with an `AbortError`.
 */
export type AiTransport< Body = object > = (
	body: Body,
	onChunk: ( chunk: string ) => void,
	signal: AbortSignal
) => Promise< void >;
