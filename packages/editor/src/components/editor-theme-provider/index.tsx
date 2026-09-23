/**
 * External dependencies
 */
import { createContext, useContext, type ReactNode } from 'react';

/**
 * WordPress dependencies
 */
import { ThemeProvider } from '@wordpress/theme';

/**
 * Internal dependencies
 */
import { useSystemDark } from './use-system-dark';
import './gutenberg.scss';

export type EditorTheme = 'light' | 'dark';

export type EditorThemePreference = 'system' | EditorTheme;

const ThemeContext = createContext< EditorTheme >( 'light' );

type Props = {
	theme: EditorThemePreference;
	children: ReactNode;
};

/**
 * Shared appearance for editor chrome, canvases, and embedded code editors.
 * Applies to the entire document, including body-level overlays.
 * Hosts own theme selection; mount at most one provider per document.
 *
 * @param props          Provider properties.
 * @param props.theme    Editor appearance; 'system' follows the OS.
 * @param props.children The editor and host UI.
 */
export function EditorThemeProvider( { theme: preference, children }: Props ) {
	const systemDark = useSystemDark();
	const isDark = preference === 'system' ? systemDark : preference === 'dark';
	const theme: EditorTheme = isDark ? 'dark' : 'light';

	return (
		<ThemeContext.Provider value={ theme }>
			<ThemeProvider
				isRoot
				color={ {
					background: isDark ? '#1e1e1e' : '#fcfcfc',
				} }
			>
				{ /* The canvas injects its own color-scheme through its styles prop. */ }
				<style>{ `:root { color-scheme: ${ theme }; }` }</style>
				{ children }
			</ThemeProvider>
		</ThemeContext.Provider>
	);
}

export function useEditorTheme(): EditorTheme {
	return useContext( ThemeContext );
}
