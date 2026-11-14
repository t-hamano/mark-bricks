/**
 * A failed request to an AI provider. The message is written for the user.
 */
export class AiError extends Error {
	/**
	 * The kind of failure, such as `authentication_error`, or `null` when
	 * it is not known.
	 */
	readonly errorType: string | null;

	constructor( message: string, errorType: string | null = null ) {
		super( message );
		this.name = 'AiError';
		this.errorType = errorType;
	}
}
