/**
 * External dependencies
 */
import type { Handle, Options } from 'mdast-util-to-markdown';

/**
 * Runs a default handler with one serialization option swapped for the
 * duration of the call.
 *
 * The options that spell these constructs — `emphasis`, `strong`,
 * `resourceLink` — are document-wide, so the per-node choice a recorded syntax
 * stands for cannot be expressed through them. Each default handler reads its
 * option from `state.options` at the top of the call, so the option is swapped
 * around that one call and restored afterwards — including for nested nodes,
 * which re-enter this helper and restore their own outer value.
 *
 * @param key     The option to swap.
 * @param value   The value to run the handler with.
 * @param handler The default handler to run.
 * @param args    The arguments the handler was called with.
 * @return The handler's output.
 */
export function withOption< K extends keyof Options >(
	key: K,
	value: Options[ K ],
	handler: Handle,
	...args: Parameters< Handle >
): string {
	const [ , , state ] = args;
	const previous = state.options[ key ];
	state.options[ key ] = value;
	try {
		return handler( ...args );
	} finally {
		state.options[ key ] = previous;
	}
}
