import wpPlugin from '@wordpress/eslint-plugin';

export default [
	{
		ignores: [
			'tmp/**',
			'**/src-tauri/**',
			'**/dist/**',
			'**/node_modules/**',
		],
	},
	...wpPlugin.configs.recommended,
	{
		files: [ '{packages,apps}/*/src/**/*.{ts,tsx}' ],
		rules: {
			'@wordpress/no-unsafe-wp-apis': 'off',
			'@wordpress/dependency-group': 'error',
			'space-in-parens': [
				'error',
				'always',
				{ exceptions: [ 'empty' ] },
			],
		},
	},
	{
		files: [
			'{packages,apps}/*/scripts/**/*.{js,mjs,cjs}',
			'apps/*/e2e/**/*.{js,mjs,cjs}',
		],
		rules: {
			'no-console': 'off',
		},
	},
	{
		files: [ '**/*.stories.{ts,tsx}', 'storybook/**/*.{ts,tsx}' ],
		rules: {
			'import/no-extraneous-dependencies': [
				'error',
				{ devDependencies: true },
			],
		},
	},
];
