/// <reference types="vite/client" />
import type { Preview } from '@storybook/react-vite';
import { registerBlocks, registerFormats } from '@mark-bricks/editor';
import './preview.scss';

// Stories render `<Editor>` directly, so register its blocks/formats once at boot.
registerBlocks();
registerFormats();

const preview: Preview = {
	parameters: {
		layout: 'fullscreen',
		docs: {
			canvas: {
				sourceState: 'hidden',
			},
		},
	},
};

export default preview;
