/**
 * Internal dependencies
 */
import { expect, storyUrl, test } from './storybook';

const STORIES = [
	{
		id: 'codepreview--math-formula',
		block: '.wp-block-math',
		ready: '.katex',
	},
	{
		id: 'codepreview--math-parse-error',
		block: '.wp-block-math',
		ready: '.wp-block-math__preview-error',
	},
	{
		id: 'codepreview--mermaid-diagram',
		block: '.wp-block-code',
		ready: '.wp-block-code__preview-content svg',
	},
	{
		id: 'codepreview--mermaid-parse-error',
		block: '.wp-block-code',
		ready: '.wp-block-code__preview-error',
	},
];

for ( const { id, block: blockSelector, ready } of STORIES ) {
	test( id, async ( { page } ) => {
		await page.goto( storyUrl( id ) );

		const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
		const block = canvas.locator( blockSelector );
		await expect( block.locator( ready ) ).toBeVisible();
		// Wait until the KaTeX fonts, which load on first use, have arrived.
		await canvas
			.locator( 'body' )
			.evaluate( () => document.fonts.ready.then( () => undefined ) );

		await expect( block ).toHaveScreenshot( `${ id }.png` );
	} );
}
