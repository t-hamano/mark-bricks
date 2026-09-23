/**
 * Internal dependencies
 */
import {
	useMediaQuery,
	useSystemDark,
} from '../editor-theme-provider/use-system-dark';
import type { CodeEditorTheme, CodeEditorThemePreference } from './themes';

/**
 * Resolves a theme preference to a concrete Monaco theme, upgrading to the
 * high-contrast variant whenever `forced-colors`/`prefers-contrast` is active.
 *
 * @param preference Stored theme preference.
 */
export function useCodeEditorTheme(
	preference: CodeEditorThemePreference
): CodeEditorTheme {
	const systemDark = useSystemDark();
	const forcedColors = useMediaQuery( '(forced-colors: active)' );
	const prefersMoreContrast = useMediaQuery( '(prefers-contrast: more)' );

	const isDark = preference === 'system' ? systemDark : preference === 'dark';

	if ( forcedColors || prefersMoreContrast ) {
		return isDark ? 'hc-black' : 'hc-light';
	}
	return isDark ? 'vs-dark' : 'vs';
}
