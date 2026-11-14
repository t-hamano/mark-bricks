/// <reference types="vite/client" />
import type { Preview } from '@storybook/react-vite';
import { DecoratorHelpers } from '@storybook/addon-themes';
import type { ReactNode } from 'react';
import { EditorThemeProvider, setupEditor } from '@mark-bricks/editor';
import { useEnableWpCompatOverlaySlot } from '@wordpress/ui';
import './preview.scss';

// English and the locales that the editor has translations for, by their
// WordPress locale slugs, named in their own language.
const LOCALES = [
	{ value: 'en', title: 'English' },
	{ value: 'cs_CZ', title: 'Čeština' },
	{ value: 'de_DE', title: 'Deutsch' },
	{ value: 'es_ES', title: 'Español' },
	{ value: 'fr_FR', title: 'Français' },
	{ value: 'it_IT', title: 'Italiano' },
	{ value: 'ja', title: '日本語' },
	{ value: 'ko_KR', title: '한국어' },
	{ value: 'pl_PL', title: 'Polski' },
	{ value: 'pt_BR', title: 'Português (Brasil)' },
	{ value: 'ru_RU', title: 'Русский' },
	{ value: 'tr_TR', title: 'Türkçe' },
	{ value: 'zh_CN', title: '简体中文' },
	{ value: 'zh_TW', title: '繁體中文' },
];

const DEFAULT_LOCALE = 'en';

/**
 * Reads the locale from the `globals` query of the preview's URL, where
 * Storybook keeps the globals across reloads (e.g. `globals=locale:ja`).
 *
 * @return Locale slug, or the default when the URL names none.
 */
function getUrlLocale(): string {
	const globals = new URLSearchParams( location.search ).get( 'globals' );
	const entry = globals
		?.split( ';' )
		.find( ( pair ) => pair.startsWith( 'locale:' ) );
	return entry?.slice( 'locale:'.length ) || DEFAULT_LOCALE;
}

/**
 * Puts a locale in the `globals` query of the preview's URL, keeping the other
 * globals, and reloads the preview so that it starts in that locale.
 *
 * @param locale Locale slug.
 */
function reloadInLocale( locale: string ) {
	const params = new URLSearchParams( location.search );
	const globals = ( params.get( 'globals' ) ?? '' )
		.split( ';' )
		.filter( ( pair ) => pair && ! pair.startsWith( 'locale:' ) );
	params.set( 'globals', [ ...globals, `locale:${ locale }` ].join( ';' ) );
	location.replace( `${ location.pathname }?${ params }${ location.hash }` );
}

// The editor translates some strings only once, such as block names when it
// registers the blocks, so a change of locale reloads the preview rather than
// re-rendering the story.
const urlLocale = getUrlLocale();
const editorReady = setupEditor( urlLocale );

const { initializeThemeState, pluckThemeFromContext } = DecoratorHelpers;
initializeThemeState( [ 'Light', 'Dark' ], 'Light' );

// Portals @wordpress/ui overlays into a body-level slot that stacks above
// the editor, as the apps do.
function OverlaySlot( { children }: { children: ReactNode } ) {
	useEnableWpCompatOverlaySlot();
	return children;
}

const preview: Preview = {
	loaders: [
		async () => {
			await editorReady;
		},
	],
	globalTypes: {
		locale: {
			description: 'Language of the editor',
			toolbar: {
				title: 'Locale',
				icon: 'globe',
				items: LOCALES,
				dynamicTitle: true,
			},
		},
	},
	initialGlobals: {
		locale: DEFAULT_LOCALE,
	},
	decorators: [
		( Story, context ) => {
			const locale = context.globals.locale ?? DEFAULT_LOCALE;
			if ( locale !== urlLocale ) {
				reloadInLocale( locale );
				return <></>;
			}
			return (
				<EditorThemeProvider
					theme={
						pluckThemeFromContext( context ) === 'Dark'
							? 'dark'
							: 'light'
					}
				>
					<OverlaySlot>
						<Story />
					</OverlaySlot>
				</EditorThemeProvider>
			);
		},
	],
	parameters: {
		layout: 'fullscreen',
		docs: {
			story: { inline: false, height: '600px' },
			canvas: {
				sourceState: 'hidden',
			},
		},
	},
};

export default preview;
