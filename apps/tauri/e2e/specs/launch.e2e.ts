import { browser, $ } from '@wdio/globals';

describe( 'App launch', () => {
	it( 'mounts the React root and renders some content', async () => {
		const root = await $( '#root' );
		await root.waitForExist( { timeout: 30_000 } );
		await browser.waitUntil(
			async () =>
				( await root.getHTML( { includeSelectorTag: false } ) ).trim()
					.length > 0,
			{
				timeout: 30_000,
				timeoutMsg: '#root never received any rendered content',
			}
		);
	} );

	it( 'has the expected window title', async () => {
		const title = await browser.getTitle();
		expect( title ).toBe( 'MarkBricks' );
	} );
} );
