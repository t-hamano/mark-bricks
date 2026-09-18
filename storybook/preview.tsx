/// <reference types="vite/client" />
import type { Preview } from '@storybook/react-vite';
import { DecoratorHelpers } from '@storybook/addon-themes';
import {
	EditorThemeProvider,
	registerBlocks,
	registerFormats,
} from '@mark-bricks/editor';
import './preview.scss';

registerBlocks();
registerFormats();

const { initializeThemeState, pluckThemeFromContext } = DecoratorHelpers;
initializeThemeState( [ 'Light', 'Dark' ], 'Light' );

const preview: Preview = {
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
