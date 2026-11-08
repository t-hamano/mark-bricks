/**
 * Splits a server-sent event stream into the JSON payloads of its events.
 * The stream may arrive in chunks that cut lines and events anywhere.
 *
 * @param onData Called with the parsed `data` of each event.
 * @return `push` takes the next chunk, and `end` handles what is left.
 */
export function createSseParser( onData: ( data: unknown ) => void ) {
	let buffer = '';
	let dataLines: string[] = [];

	const dispatch = () => {
		if ( dataLines.length === 0 ) {
			return;
		}
		const data = dataLines.join( '\n' );
		dataLines = [];
		onData( JSON.parse( data ) );
	};

	const handleLine = ( line: string ) => {
		if ( line === '' ) {
			dispatch();
			return;
		}
		if ( line.startsWith( ':' ) ) {
			return;
		}
		const colon = line.indexOf( ':' );
		const field = colon === -1 ? line : line.slice( 0, colon );
		let value = colon === -1 ? '' : line.slice( colon + 1 );
		if ( value.startsWith( ' ' ) ) {
			value = value.slice( 1 );
		}
		// The payload carries its own `type`, so the `event` field is not
		// needed.
		if ( field === 'data' ) {
			dataLines.push( value );
		}
	};

	return {
		push( chunk: string ) {
			buffer += chunk;
			// A trailing `\r` may be the first half of `\r\n`, so it waits
			// for the next chunk.
			const held = buffer.endsWith( '\r' ) ? '\r' : '';
			const lines = buffer
				.slice( 0, buffer.length - held.length )
				.split( /\r\n|\r|\n/ );
			// The last piece is an unfinished line.
			buffer = ( lines.pop() ?? '' ) + held;
			lines.forEach( handleLine );
		},
		end() {
			const rest = buffer.replace( /\r$/, '' );
			buffer = '';
			if ( rest !== '' ) {
				handleLine( rest );
			}
			dispatch();
		},
	};
}
