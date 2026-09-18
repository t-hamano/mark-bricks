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
	addons: [ '@storybook/addon-docs', '@storybook/addon-themes' ],
	viteFinal: ( viteConfig ) => ( {
		...viteConfig,
		build: {
			...viteConfig.build,
			// Preserve light-dark(): color-scheme is injected at runtime, so
			// Lightning CSS cannot generate its compatibility variables.
			cssTarget: [ 'chrome123', 'edge123', 'firefox120', 'safari17.5' ],
		},
	} ),
};

export default config;
