/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { parseImageSrc } from '.';

describe( 'parseImageSrc', () => {
	it.each( [
		'https://example.com/a.png',
		'http://example.com/a.png',
		'data:image/png;base64,AAAA',
		'blob:https://example.com/1234',
	] )( 'classifies %s as a URL', ( src ) => {
		expect( parseImageSrc( src ) ).toEqual( { type: 'url' } );
	} );

	it.each( [
		[ 'C:\\abs\\a.png', 'C:\\abs\\a.png' ],
		[ 'C:/abs/a.png', 'C:/abs/a.png' ],
		[ '\\\\server\\share\\a.png', '\\\\server\\share\\a.png' ],
		[ '//server/share/a.png', '//server/share/a.png' ],
		[ '\\abs\\a.png', '\\abs\\a.png' ],
	] )( 'classifies %s as absolute', ( src, path ) => {
		expect( parseImageSrc( src ) ).toEqual( { type: 'absolute', path } );
	} );

	it.each( [
		[ 'file:///abs/a.png', '/abs/a.png' ],
		[ 'file://localhost/abs/a.png', '/abs/a.png' ],
		[ 'file:///C:/abs/my%20a.png', 'C:/abs/my a.png' ],
		[ 'file://server/share/a.png', '\\\\server\\share\\a.png' ],
		[ 'file:///abs/a.png?v=1#top', '/abs/a.png' ],
		[ 'file:///abs/chart%23final.png', '/abs/chart#final.png' ],
	] )( 'converts the file URL %s to an absolute path', ( src, path ) => {
		expect( parseImageSrc( src ) ).toEqual( { type: 'absolute', path } );
	} );

	it( 'leaves a file URL it cannot parse to the webview', () => {
		expect( parseImageSrc( 'file://a b/c.png' ) ).toEqual( {
			type: 'url',
		} );
	} );

	it( 'classifies a single leading slash as rooted', () => {
		expect( parseImageSrc( '/assets/a.png' ) ).toEqual( {
			type: 'rooted',
			path: '/assets/a.png',
		} );
	} );

	it.each( [
		[ 'a.png', 'a.png' ],
		[ './images/a.png', './images/a.png' ],
		[ '../a.png', '../a.png' ],
		[ '..\\a.png', '..\\a.png' ],
	] )( 'classifies %s as relative', ( src, path ) => {
		expect( parseImageSrc( src ) ).toEqual( { type: 'relative', path } );
	} );

	it.each( [
		[ 'my%20chart%23final.png', 'my chart#final.png' ],
		[ 'a%3Fb.png', 'a?b.png' ],
		[ '100%.png', '100%.png' ],
		[ 'bad%E0%A4%A.png', 'bad%E0%A4%A.png' ],
	] )( 'decodes %s', ( src, path ) => {
		expect( parseImageSrc( src ) ).toEqual( { type: 'relative', path } );
	} );

	it.each( [
		[ '/tmp/chart#final.png', 'rooted' ],
		[ 'C:\\tmp\\a?b.png', 'absolute' ],
		[ 'images/a.png?v=1#top', 'relative' ],
	] )( 'keeps `?` and `#` in the file name %s', ( src, type ) => {
		expect( parseImageSrc( src ) ).toEqual( { type, path: src } );
	} );
} );
