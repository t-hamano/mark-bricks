const wpConfig = require( '@wordpress/prettier-config' );

module.exports = {
	...wpConfig,
	overrides: [
		...( wpConfig.overrides ?? [] ),
		{
			// Prettier has no option to disable printWidth, so use a large
			// value to effectively stop wrapping CSS/SCSS values. This avoids
			// conflicts with Stylelint's declaration-colon rules from
			// @wordpress/stylelint-config/scss-stylistic.
			files: '*.{css,sass,scss}',
			options: {
				printWidth: 9999,
			},
		},
	],
};
