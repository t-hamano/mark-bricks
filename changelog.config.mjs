/**
 * Shared `conventional-changelog` config for the apps' `version` scripts.
 *
 * Each app's changelog collects commits that touch the app itself and the
 * shared packages it ships. The CLI's `--commit-path` takes only one path, so
 * the list lives here. Paths are relative to the app directory the scripts
 * run from.
 */
export default {
	commits: {
		path: [
			'.',
			'../../packages/editor',
			'../../packages/image-path',
			'../../packages/katex-fonts',
			'../../packages/marp-preview',
		],
	},
};
