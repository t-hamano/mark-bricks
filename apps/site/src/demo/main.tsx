/**
 * External dependencies
 */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
	Editor,
	EditorThemeProvider,
	setupEditor,
	type EditorTheme,
} from '@mark-bricks/editor';

/**
 * Internal dependencies
 */
import HeaderActions from './header-actions';

const sample = `# Project notes

This is a sample Markdown document. **Edit this text** as a block or use the Code editor button to edit the source.

## Tasks

- Review the requirements.
- Update the documentation.
- Run the tests.
`;

// The demo is embedded in the site, so follow the theme the site applies.
const siteRoot = window.parent.document.documentElement;

function getSiteTheme(): EditorTheme {
	return siteRoot.dataset.theme === 'dark' ? 'dark' : 'light';
}

function Demo() {
	const [ theme, setTheme ] = useState( getSiteTheme );
	const [ content, setContent ] = useState( sample );
	const [ mode, setMode ] = useState< 'visual' | 'text' >( 'visual' );
	const [ topToolbar, setTopToolbar ] = useState( true );
	const [ spotlightMode, setSpotlightMode ] = useState( false );

	useEffect( () => {
		const observer = new MutationObserver( () =>
			setTheme( getSiteTheme() )
		);
		observer.observe( siteRoot, { attributeFilter: [ 'data-theme' ] } );
		return () => observer.disconnect();
	}, [] );

	return (
		<EditorThemeProvider theme={ theme }>
			<Editor
				content={ content }
				onChange={ setContent }
				editorMode={ mode }
				onEditorModeChange={ setMode }
				settings={ {
					fixedToolbar: topToolbar,
					focusMode: spotlightMode,
					showBlockBreadcrumbs: false,
					spellCheck: true,
					codeEditor: {
						theme,
					},
				} }
				headerActions={
					<HeaderActions
						topToolbar={ topToolbar }
						onTopToolbarChange={ setTopToolbar }
						spotlightMode={ spotlightMode }
						onSpotlightModeChange={ setSpotlightMode }
					/>
				}
			/>
		</EditorThemeProvider>
	);
}

const root = document.getElementById( 'root' );
if ( root ) {
	await setupEditor( 'en' );
	createRoot( root ).render( <Demo /> );
}
