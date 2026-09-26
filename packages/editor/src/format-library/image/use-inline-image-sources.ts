/**
 * WordPress dependencies
 */
import { useRefEffect } from '@wordpress/compose';

/**
 * Internal dependencies
 */
import { usePlatform } from '../../platform';

// Inline images in the editable content, as RichText renders them.
const INLINE_IMAGE_SELECTOR = '.rich-text img[src]';

/**
 * Displays inline images at the URL the platform resolves their `src` to,
 * so local paths such as `![alt](./image.png)` render in the canvas.
 *
 * RichText renders the Markdown URL as the `<img src>` and reads it back on
 * input, so the resolved URL cannot go on the element: it would end up in
 * the Markdown. Instead, a stylesheet in the canvas document replaces each
 * image's content by `src` with CSS `content: url()`, leaving the DOM as
 * RichText expects it.
 */
export function useInlineImageSources() {
	const { resolveImageSrc } = usePlatform();

	return useRefEffect< HTMLElement >(
		( node ) => {
			const doc = node.ownerDocument;
			const style = doc.createElement( 'style' );
			doc.head.appendChild( style );

			// Every `src` seen so far, so each resolves once.
			const requested = new Set< string >();
			// Only the ones whose resolved URL differs from `src`.
			const resolved = new Map< string, string >();
			let isActive = true;

			const render = () => {
				style.textContent = Array.from(
					resolved,
					( [ src, url ] ) =>
						`.rich-text img[src="${ CSS.escape(
							src
						) }"]{content:url("${ CSS.escape( url ) }")}`
				).join( '\n' );
			};

			const scan = () => {
				node.querySelectorAll( INLINE_IMAGE_SELECTOR ).forEach(
					( image ) => {
						const src = image.getAttribute( 'src' );
						if ( ! src || requested.has( src ) ) {
							return;
						}
						requested.add( src );
						resolveImageSrc( src ).then( ( url ) => {
							if ( ! isActive || url === src ) {
								return;
							}
							resolved.set( src, url );
							render();
						} );
					}
				);
			};

			scan();
			const observer = new MutationObserver( scan );
			observer.observe( node, {
				subtree: true,
				childList: true,
				attributes: true,
				attributeFilter: [ 'src' ],
			} );

			return () => {
				isActive = false;
				observer.disconnect();
				style.remove();
			};
		},
		[ resolveImageSrc ]
	);
}
