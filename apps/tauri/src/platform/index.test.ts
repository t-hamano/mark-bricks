/**
 * External dependencies
 */
import { describe, expect, it } from 'vitest';

/**
 * Internal dependencies
 */
import { createPlatform, resolveImagePath } from '.';

describe( 'resolveImagePath', () => {
	it( 'resolves relative paths against the POSIX document folder', () => {
		expect( resolveImagePath( './images/a.png', '/docs/note.md' ) ).toBe(
			'/docs/images/a.png'
		);
		expect( resolveImagePath( 'a.png', '/docs/note.md' ) ).toBe(
			'/docs/a.png'
		);
		expect( resolveImagePath( '../img/a.png', '/docs/sub/note.md' ) ).toBe(
			'/docs/img/a.png'
		);
	} );

	it( 'resolves relative paths against the Windows document folder', () => {
		expect(
			resolveImagePath( './images/a.png', 'C:\\docs\\note.md' )
		).toBe( 'C:\\docs\\images\\a.png' );
		expect(
			resolveImagePath( '..\\a.png', 'C:\\docs\\sub\\note.md' )
		).toBe( 'C:\\docs\\a.png' );
	} );

	it( 'does not climb above the root', () => {
		expect( resolveImagePath( '../../a.png', '/note.md' ) ).toBe(
			'/a.png'
		);
		expect( resolveImagePath( '../../a.png', 'C:\\note.md' ) ).toBe(
			'C:\\a.png'
		);
		expect(
			resolveImagePath( '../../a.png', '\\\\host\\share\\note.md' )
		).toBe( '\\\\host\\share\\a.png' );
	} );

	it( 'resolves relative paths below a UNC share', () => {
		expect(
			resolveImagePath( '../a.png', '\\\\host\\share\\docs\\note.md' )
		).toBe( '\\\\host\\share\\a.png' );
	} );

	it( 'decodes percent-encoding', () => {
		expect(
			resolveImagePath( 'my%20chart%23final.png', '/docs/note.md' )
		).toBe( '/docs/my chart#final.png' );
		// A literal `%` that is not an escape is kept as is.
		expect( resolveImagePath( '100%.png', '/docs/note.md' ) ).toBe(
			'/docs/100%.png'
		);
	} );

	it( 'keeps `?` and `#` in file names', () => {
		expect( resolveImagePath( '/tmp/chart#final.png' ) ).toBe(
			'/tmp/chart#final.png'
		);
		expect( resolveImagePath( 'a?b.png', '/docs/note.md' ) ).toBe(
			'/docs/a?b.png'
		);
	} );

	it( 'drops the query and hash of file URLs', () => {
		expect( resolveImagePath( 'file:///abs/a.png?v=1#top' ) ).toBe(
			'/abs/a.png'
		);
	} );

	it( 'keeps absolute paths as is', () => {
		expect( resolveImagePath( '/abs/a.png', '/docs/note.md' ) ).toBe(
			'/abs/a.png'
		);
		expect(
			resolveImagePath( 'D:\\abs\\a.png', 'C:\\docs\\note.md' )
		).toBe( 'D:\\abs\\a.png' );
		expect( resolveImagePath( 'D:/abs/a.png', 'C:\\docs\\note.md' ) ).toBe(
			'D:/abs/a.png'
		);
	} );

	it( 'converts file URLs to paths', () => {
		expect( resolveImagePath( 'file:///abs/a.png', '/docs/note.md' ) ).toBe(
			'/abs/a.png'
		);
		expect( resolveImagePath( 'file:///C:/abs/my%20a.png' ) ).toBe(
			'C:/abs/my a.png'
		);
		expect( resolveImagePath( 'file://localhost/abs/a.png' ) ).toBe(
			'/abs/a.png'
		);
	} );

	it( 'keeps the host of UNC file URLs', () => {
		expect(
			resolveImagePath(
				'file://server/share/my%20a.png',
				'/docs/note.md'
			)
		).toBe( '\\\\server\\share\\my a.png' );
	} );

	it( 'keeps relative paths when the document is unsaved', () => {
		expect( resolveImagePath( './a.png' ) ).toBe( './a.png' );
	} );
} );

describe( 'createPlatform().getImageNotice', () => {
	it( 'warns about relative paths in an unsaved document', async () => {
		const { getImageNotice } = createPlatform();
		expect( await getImageNotice?.( './a.png' ) ).toMatch( /saved/ );
	} );

	it( 'warns about HTTP URLs, which the CSP blocks', async () => {
		for ( const documentPath of [ undefined, '/docs/note.md' ] ) {
			const { getImageNotice } = createPlatform( documentPath );
			expect(
				await getImageNotice?.( 'http://example.com/a.png' )
			).toMatch( /HTTPS/ );
		}
	} );

	it( 'does not warn about paths that resolve without a folder', async () => {
		const { getImageNotice } = createPlatform();
		for ( const path of [
			'https://example.com/a.png',
			'data:image/png;base64,AAAA',
			'file:///abs/a.png',
			'/abs/a.png',
			'C:\\abs\\a.png',
		] ) {
			expect( await getImageNotice?.( path ) ).toBeNull();
		}
	} );

	it( 'does not warn once the document is saved', async () => {
		const { getImageNotice } = createPlatform( '/docs/note.md' );
		expect( await getImageNotice?.( './a.png' ) ).toBeNull();
	} );
} );
