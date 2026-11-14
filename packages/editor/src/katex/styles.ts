/**
 * External dependencies
 */
import { useEffect, useState } from 'react';
import katexCss from 'katex/dist/katex.min.css?raw';
import { KATEX_FONT_URLS, rewriteFontSources } from '@mark-bricks/katex-fonts';

/**
 * Internal dependencies
 */
import { usePlatform } from '../platform';

/**
 * KaTeX's stylesheet for the block canvas.
 */
export const katexStyles = rewriteFontSources( katexCss );

/**
 * Returns KaTeX's stylesheet with each font at the URL the platform resolves
 * it to, or null while the URLs resolve.
 */
export function useKatexStyles(): string | null {
	const { resolveAssetUrl } = usePlatform();
	const [ styles, setStyles ] = useState< string | null >( () =>
		resolveAssetUrl ? null : katexStyles
	);

	useEffect( () => {
		if ( ! resolveAssetUrl ) {
			setStyles( katexStyles );
			return;
		}

		let cancelled = false;
		Promise.all(
			Object.entries( KATEX_FONT_URLS ).map( async ( [ name, url ] ) => [
				name,
				await resolveAssetUrl( url ),
			] )
		).then( ( entries ) => {
			if ( ! cancelled ) {
				setStyles(
					rewriteFontSources(
						katexCss,
						Object.fromEntries( entries )
					)
				);
			}
		} );
		return () => {
			cancelled = true;
		};
	}, [ resolveAssetUrl ] );

	return styles;
}
