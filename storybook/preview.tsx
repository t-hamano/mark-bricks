/// <reference types="vite/client" />
import type { Preview } from '@storybook/react-vite';
import { DecoratorHelpers } from '@storybook/addon-themes';
import { EditorThemeProvider, setupEditor } from '@mark-bricks/editor';
import './preview.scss';

const editorReady = setupEditor( 'en' );

const { initializeThemeState, pluckThemeFromContext } = DecoratorHelpers;
initializeThemeState( [ 'Light', 'Dark' ], 'Light' );

const preview: Preview = {
	loaders: [
		async () => {
			await editorReady;
		},
	],
	decorators: [
		( Story, context ) => (
			<EditorThemeProvider
				theme={
					pluckThemeFromContext( context ) === 'Dark'
						? 'dark'
						: 'light'
				}
			>
				<Story />
			</EditorThemeProvider>
		),
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
