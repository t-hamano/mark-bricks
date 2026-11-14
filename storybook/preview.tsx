/// <reference types="vite/client" />
import type { Preview } from '@storybook/react-vite';
import { DecoratorHelpers } from '@storybook/addon-themes';
import type { ReactNode } from 'react';
import { EditorThemeProvider, setupEditor } from '@mark-bricks/editor';
import { useEnableWpCompatOverlaySlot } from '@wordpress/ui';
import './preview.scss';

const editorReady = setupEditor( 'en' );

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
	decorators: [
		( Story, context ) => (
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
