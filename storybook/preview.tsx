/// <reference types="vite/client" />
import type { Preview } from '@storybook/react-vite';
import './preview.scss';

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
