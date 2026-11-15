/**
 * `conventional-changelog` config for the VS Code extension's `version`
 * scripts.
 *
 * Extends the shared config and leaves out commits scoped `ai`. The AI
 * assistant lives in `packages/editor` but only MarkBricks Desktop provides it,
 * so its commits would otherwise list features the extension does not have.
 */
import config from './changelog.config.mjs';

export default {
	...config,
	commits: {
		...config.commits,
		// Matched against each raw commit message, which starts with the header.
		ignore: /^\w+\(ai\):/,
	},
};
