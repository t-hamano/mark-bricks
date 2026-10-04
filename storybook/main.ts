import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
	// Relative image URLs in the shared Markdown examples resolve against
	// the Storybook root, both in development and under /storybook/ on Pages.
	staticDirs: [ '../packages/fixtures/markdown' ],
	stories: [
		'./*.stories.@(ts|tsx)',
		// The visual regression tests' stories stay out of the published
		// Storybook.
		...( process.env.STORYBOOK_VISUAL_TESTS
			? [ './visual/*.stories.@(ts|tsx)' ]
			: [] ),
	],
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
