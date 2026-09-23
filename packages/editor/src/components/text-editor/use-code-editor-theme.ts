/**
 * External dependencies
 */
import { useSyncExternalStore } from 'react';

/**
 * Internal dependencies
 */
import type { CodeEditorTheme, CodeEditorThemePreference } from './themes';

function useMediaQuery( query: string ): boolean {
	return useSyncExternalStore(
		( onChange ) => {
			const mediaQueryList = window.matchMedia( query );
			mediaQueryList.addEventListener( 'change', onChange );
			return () =>
				mediaQueryList.removeEventListener( 'change', onChange );
		},
		() => window.matchMedia( query ).matches
	);
}

/**
 * Resolves a theme preference to a concrete Monaco theme, upgrading to the
 * high-contrast variant whenever `forced-colors`/`prefers-contrast` is active.
 *
 * @param preference Stored theme preference.
 */
export function useCodeEditorTheme(
	preference: CodeEditorThemePreference
): CodeEditorTheme {
	const prefersDark = useMediaQuery( '(prefers-color-scheme: dark)' );
	const forcedColors = useMediaQuery( '(forced-colors: active)' );
	const prefersMoreContrast = useMediaQuery( '(prefers-contrast: more)' );

	const isDark =
		preference === 'system' ? prefersDark : preference === 'dark';

	if ( forcedColors || prefersMoreContrast ) {
		return isDark ? 'hc-black' : 'hc-light';
	}
	return isDark ? 'vs-dark' : 'vs';
}
