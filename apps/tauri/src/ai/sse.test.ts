/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { createSseParser } from './sse';

function parse( chunks: string[] ) {
	const events: unknown[] = [];
	const parser = createSseParser( ( data ) => events.push( data ) );
	chunks.forEach( parser.push );
	parser.end();
	return events;
}

const STREAM =
	'event: ping\ndata: {"type":"ping"}\n\n' +
	': a comment\n' +
	'event: message_stop\ndata: {"type":"message_stop"}\n\n';

describe( 'createSseParser', () => {
	it( 'parses the data of each event', () => {
		expect( parse( [ STREAM ] ) ).toEqual( [
			{ type: 'ping' },
			{ type: 'message_stop' },
		] );
	} );

	it( 'handles chunks that cut lines anywhere', () => {
		expect( parse( STREAM.split( '' ) ) ).toEqual( [
			{ type: 'ping' },
			{ type: 'message_stop' },
		] );
	} );

	it( 'handles CRLF line breaks cut between CR and LF', () => {
		const crlf = STREAM.replace( /\n/g, '\r\n' );
		expect( parse( crlf.split( '' ) ) ).toEqual( [
			{ type: 'ping' },
			{ type: 'message_stop' },
		] );
	} );

	it( 'joins the data lines of one event', () => {
		expect( parse( [ 'data: {"type":\ndata: "ping"}\n\n' ] ) ).toEqual( [
			{ type: 'ping' },
		] );
	} );

	it( 'skips the event that marks the end of the stream', () => {
		expect(
			parse( [ 'data: {"type":"ping"}\n\ndata: [DONE]\n\n' ] )
		).toEqual( [ { type: 'ping' } ] );
	} );

	it( 'dispatches the last event when the stream ends without a blank line', () => {
		expect( parse( [ 'data: {"type":"ping"}' ] ) ).toEqual( [
			{ type: 'ping' },
		] );
	} );
} );
