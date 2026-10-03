/**
 * External dependencies
 */
import { Marp, type MarpOptions } from '@marp-team/marp-core';

type Token = {
	type: string;
	tag: string;
	hidden: boolean;
	content: string;
};

type CoreState = {
	inlineMode: boolean;
	tokens: Token[];
	env: ExportEnv;
};

type ExportEnv = {
	globalDirectives?: Record< string, unknown >;
	headingTitle?: string;
};

export type DeckInfo = {
	title?: string;
	description?: string;
	author?: string;
	keywords?: string[];
	url?: string;
	image?: string;
	lang?: string;
	// The size of each slide in px.
	width: number;
	height: number;
};

/**
 * Creates the Marp instance that exports decks: Marp Core with its defaults,
 * as the official Marp tools use it. Unlike the preview, it keeps the inline
 * browser script, KaTeX's CDN font URLs and the web fonts a theme imports,
 * since an exported deck runs under no CSP.
 *
 * It also serves as Marp CLI's functional engine (`--engine`), so that Marp
 * CLI renders with this package's Marp Core version and options.
 *
 * @param options Constructor options, such as the ones Marp CLI passes.
 * @return A Marp instance.
 */
export function createExportMarp( options: MarpOptions = {} ): Marp {
	return new Marp( options );
}

function toKeywords( value: unknown ): string[] | undefined {
	let keywords: unknown[] | undefined;
	if ( Array.isArray( value ) ) {
		keywords = value;
	} else if ( typeof value === 'string' ) {
		keywords = value.split( ',' ).map( ( keyword ) => keyword.trim() );
	}
	const filtered = [
		...new Set(
			( keywords ?? [] ).filter(
				( keyword ): keyword is string =>
					typeof keyword === 'string' && !! keyword
			)
		),
	];
	return filtered.length > 0 ? filtered : undefined;
}

function isUrl( value: unknown ): value is string {
	if ( typeof value !== 'string' ) {
		return false;
	}
	try {
		new URL( value );
		return true;
	} catch {
		return false;
	}
}

// The title Marp CLI falls back to: the raw text of the deck's top-level
// heading.
function detectHeadingTitle( tokens: Token[] ): string | undefined {
	let best: { level: number; content?: string } = { level: Infinity };
	tokens.forEach( ( token, index ) => {
		const level = /^h([1-6])$/.exec( token.tag )?.[ 1 ];
		const next = tokens[ index + 1 ];
		if (
			token.type === 'heading_open' &&
			! token.hidden &&
			level &&
			next?.type === 'inline' &&
			Number( level ) < best.level
		) {
			best = { level: Number( level ), content: next.content.trim() };
		}
	} );
	return best.content;
}

// Renders the slides straight into the page's `<body>`, as Marp CLI's `bare`
// template does.
const marp = createExportMarp( {
	container: [],
	slideContainer: [],
} ).use( ( md ) => {
	// The metadata directives Marp CLI adds. Marp Core knows only `lang`.
	const text = ( name: string ) => ( value: unknown ) =>
		typeof value === 'string' ? { [ name ]: value } : {};
	Object.assign( md.marpit.customDirectives.global, {
		title: text( 'markBricksTitle' ),
		description: text( 'markBricksDescription' ),
		author: text( 'markBricksAuthor' ),
		image: text( 'markBricksImage' ),
		keywords: ( value: unknown ) => {
			const keywords = toKeywords( value );
			return keywords ? { markBricksKeywords: keywords } : {};
		},
		url: ( value: unknown ) =>
			isUrl( value ) ? { markBricksUrl: value } : {},
	} );

	md.core.ruler.after(
		'marpit_directives_global_parse',
		'mark_bricks_export_info',
		( { inlineMode, tokens, env }: CoreState ) => {
			if ( ! inlineMode ) {
				env.globalDirectives = md.marpit.lastGlobalDirectives;
				env.headingTitle = detectHeadingTitle( tokens );
			}
		}
	);
} );

function renderDeck( markdown: string ) {
	const env: ExportEnv = {};
	const { html, css } = marp.render( markdown, env );
	const directives = env.globalDirectives ?? {};
	const [ , width, height ] =
		/viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec( html ) ?? [];
	const info: DeckInfo = {
		title:
			( directives.markBricksTitle as string | undefined ) ??
			env.headingTitle,
		description: directives.markBricksDescription as string | undefined,
		author: directives.markBricksAuthor as string | undefined,
		keywords: directives.markBricksKeywords as string[] | undefined,
		url: directives.markBricksUrl as string | undefined,
		image: directives.markBricksImage as string | undefined,
		lang: directives.lang as string | undefined,
		width: Number( width ),
		height: Number( height ),
	};
	return { html, css, info };
}

/**
 * Reads a Marp slide deck's metadata and slide size, as Marp CLI does, for
 * a host that exports the deck itself.
 *
 * @param markdown Markdown of the deck.
 * @return The deck's metadata and slide size.
 */
export function getDeckInfo( markdown: string ): DeckInfo {
	return renderDeck( markdown ).info;
}

function escapeHtml( value: string ): string {
	return value.replace(
		/[&<>"']/g,
		( char ) => `&#${ char.charCodeAt( 0 ) };`
	);
}

// Marp CLI's `bare` template: one slide per screen, snapping as it scrolls.
const PAGE_STYLE =
	'html,body{background:#000;height:100%;margin:0;overflow:auto;scroll-snap-type:y mandatory}' +
	'body>svg{display:block;height:100%;scroll-snap-align:center center;width:100%}';

/**
 * Renders a Marp slide deck into a standalone HTML page, as Marp CLI's
 * `bare` template does. Image sources stay as written in the deck, so its
 * relative image paths work when the page is saved next to it.
 *
 * @param markdown Markdown of the deck.
 * @return The page's HTML.
 */
export function renderHtmlDocument( markdown: string ): string {
	const { html, css, info } = renderDeck( markdown );
	const meta = ( attribute: string, name: string, content?: string ) =>
		content
			? `<meta ${ attribute }="${ name }" content="${ escapeHtml(
					content
				) }">`
			: '';
	const { title, description, author, keywords, url, image, lang } = info;

	const head = [
		'<meta charset="UTF-8">',
		'<meta name="viewport" content="width=device-width,height=device-height,initial-scale=1.0">',
		title ? `<title>${ escapeHtml( title ) }</title>` : '',
		meta( 'property', 'og:title', title ),
		meta( 'property', 'og:image:alt', image && title ),
		meta( 'name', 'author', author ),
		meta( 'property', 'article:author', author ),
		meta( 'name', 'description', description ),
		meta( 'property', 'og:description', description ),
		meta( 'name', 'keywords', keywords?.join( ',' ) ),
		url ? `<link rel="canonical" href="${ escapeHtml( url ) }">` : '',
		meta( 'property', 'og:url', url ),
		meta( 'property', 'og:image', image ),
		meta( 'property', 'og:type', 'website' ),
		meta(
			'name',
			'twitter:card',
			title && image ? 'summary_large_image' : 'summary'
		),
		`<style media="screen">${ PAGE_STYLE }</style>`,
		`<style>${ css }</style>`,
	].join( '' );

	return (
		'<!DOCTYPE html>' +
		`<html${ lang ? ` lang="${ escapeHtml( lang ) }"` : '' }>` +
		`<head>${ head }</head>` +
		`<body>${ html }</body>` +
		'</html>\n'
	);
}
