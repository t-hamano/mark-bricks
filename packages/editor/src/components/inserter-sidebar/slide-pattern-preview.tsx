/**
 * External dependencies
 */
import { browser } from '@marp-team/marp-core/browser';
import { useLayoutEffect, useRef } from 'react';
// The web fonts of the built-in Gaia theme. The patterns hold no code, so
// they need no monospace font.
import '@fontsource/lato/400.css';
import '@fontsource/lato/900.css';

// Fits the first slide to the card. The slides are SVGs, so they scale with
// their width.
const PREVIEW_STYLE = `
:host { display: block; }
div.marpit > svg { display: block; width: 100%; height: auto; }
div.marpit > svg:not( :first-child ) { display: none; }
`;

type Props = {
	html: string;
	css: string;
};

/**
 * Shows the first slide of a pattern's preview.
 *
 * It renders in a shadow root, so the theme's stylesheet and the editor's
 * styles leave each other alone.
 *
 * @param props      Component props.
 * @param props.html HTML of the preview's slides.
 * @param props.css  Stylesheet of the preview's theme.
 */
export function SlidePatternPreview( { html, css }: Props ) {
	const ref = useRef< HTMLDivElement >( null );

	useLayoutEffect( () => {
		const host = ref.current;
		if ( ! host ) {
			return;
		}
		const root = host.shadowRoot ?? host.attachShadow( { mode: 'open' } );
		// The HTML was rendered ahead of time from the patterns, and the
		// text put into it is escaped.
		root.innerHTML = `<style>${ PREVIEW_STYLE }${ css }</style>${ html }`;
		// Scales auto-scaling elements, and lays out the slide in WebKit,
		// which cannot render HTML inside an SVG on its own. It must observe
		// the shadow root: an observer on the document would not reach it.
		const marpBrowser = browser( root );
		return () => marpBrowser.cleanup();
	}, [ html, css ] );

	return (
		<div
			ref={ ref }
			className="inserter-sidebar__pattern-preview"
			aria-hidden
		/>
	);
}
