/**
 * External dependencies
 */
import { emit, listen } from '@tauri-apps/api/event';
import { createSlideView } from '@mark-bricks/marp-preview/browser';
import { getDeckInfo } from '@mark-bricks/marp-preview/export';

/**
 * Internal dependencies
 */
import { renderSlides } from '../preview/render';
import './style.css';

// The page the export window prints to PDF: the slides alone, one per page.

// The events between this page and `src-tauri/src/pdf.rs`, which names them
// the same. The page sends `EXPORT_READY_EVENT` once it listens, receives the
// deck with `EXPORT_DECK_EVENT`, and sends `EXPORT_RENDERED_EVENT` once the
// slides, their fonts and their images have loaded.
const EXPORT_READY_EVENT = 'export-ready';
const EXPORT_DECK_EVENT = 'export-deck';
const EXPORT_RENDERED_EVENT = 'export-rendered';

type ExportDeck = { markdown: string; documentPath?: string };

// The page size and the PDF's metadata, or why the deck did not render.
type ExportRendered =
	| {
			width: number;
			height: number;
			title?: string;
			description?: string;
			author?: string;
			keywords?: string[];
	  }
	| { error: string };

// A hidden window may never paint, and WebKit then never runs animation
// frames, which the slide view and Marp's browser script wait for. Nothing
// animates on this page, so a timer stands in for them.
window.requestAnimationFrame = ( callback ) =>
	window.setTimeout( () => callback( performance.now() ), 0 );
window.cancelAnimationFrame = ( id ) => window.clearTimeout( id );

const pageStyle = document.createElement( 'style' );
document.head.append( pageStyle );

let rendered: ( () => void ) | null = null;
const view = createSlideView( document.body, () => rendered?.() );

// The images of the slides, including their backgrounds, which Marp sets as
// CSS.
function getImageSources(): string[] {
	const sources = new Set< string >();
	for ( const image of document.querySelectorAll( 'img' ) ) {
		sources.add( image.src );
	}
	for ( const element of document.querySelectorAll< HTMLElement >(
		'[style*="url("]'
	) ) {
		for ( const [ , source ] of element.style.backgroundImage.matchAll(
			/url\(["']?(.*?)["']?\)/g
		) ) {
			sources.add( source );
		}
	}
	return [ ...sources ];
}

// Resolves once an image loads, or fails to: a missing image leaves a gap
// in the PDF, as it does in the preview.
function loadImage( source: string ): Promise< void > {
	return new Promise( ( resolve ) => {
		const image = new Image();
		image.onload = image.onerror = () => resolve();
		image.src = source;
	} );
}

async function print( { markdown, documentPath }: ExportDeck ) {
	const { width, height, title, description, author, keywords } =
		getDeckInfo( markdown );
	pageStyle.textContent =
		`@page { size: ${ width }px ${ height }px; margin: 0; }` +
		`:root { --slide-width: ${ width }px; --slide-height: ${ height }px; }`;

	await new Promise< void >( ( resolve ) => {
		rendered = resolve;
		view.render( () => renderSlides( markdown, documentPath ) );
	} );
	await Promise.all( getImageSources().map( loadImage ) );
	await document.fonts.ready;

	return { width, height, title, description, author, keywords };
}

async function main() {
	await listen< ExportDeck >( EXPORT_DECK_EVENT, async ( { payload } ) => {
		let result: ExportRendered;
		try {
			result = await print( payload );
		} catch ( error ) {
			result = { error: String( error ) };
		}
		await emit( EXPORT_RENDERED_EVENT, result );
	} );
	await emit( EXPORT_READY_EVENT );
}

void main();
