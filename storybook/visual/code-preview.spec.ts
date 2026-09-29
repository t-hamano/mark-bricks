/**
 * Internal dependencies
 */
import { expect, storyUrl, test } from './storybook';

const STORIES = [
	{ id: 'codepreview--math-formula', ready: '.katex' },
	{
		id: 'codepreview--math-parse-error',
		ready: '.wp-block-code__preview-error',
	},
	{
		id: 'codepreview--mermaid-diagram',
		ready: '.wp-block-code__preview-content svg',
	},
	{
		id: 'codepreview--mermaid-parse-error',
		ready: '.wp-block-code__preview-error',
	},
];

for ( const { id, ready } of STORIES ) {
	test( id, async ( { page } ) => {
		await page.goto( storyUrl( id ) );

		const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
		const block = canvas.locator( '.wp-block-code' );
		await expect( block.locator( ready ) ).toBeVisible();
		// Wait until the KaTeX fonts, which load on first use, have arrived.
		await canvas
			.locator( 'body' )
			.evaluate( () => document.fonts.ready.then( () => undefined ) );

		await expect( block ).toHaveScreenshot( `${ id }.png` );
	} );
}
