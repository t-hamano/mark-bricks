import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
	stories: [ './**/*.stories.@(ts|tsx)' ],
	framework: {
		name: '@storybook/react-vite',
		options: {},
	},
	typescript: {
		reactDocgen: 'react-docgen-typescript',
	},
	addons: [ '@storybook/addon-docs' ],
};

export default config;
