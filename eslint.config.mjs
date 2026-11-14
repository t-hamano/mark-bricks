import wpPlugin from '@wordpress/eslint-plugin';

export default [
	{
		ignores: [
			'tmp/**',
			'**/src-tauri/**',
			'**/dist/**',
			'**/storybook-static/**',
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
			'.github/scripts/**/*.{js,mjs,cjs}',
			'apps/*/e2e/**/*.{js,mjs,cjs}',
		],
		rules: {
			'no-console': 'off',
		},
	},
	{
		// The VS Code extension host runs in Node without the DOM, React or
		// Vite, so it may import only the shared modules that need none of them.
		files: [ 'apps/vscode/src/{extension,shared}/**/*.ts' ],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							// Every `@mark-bricks/*` module but these.
							regex: '^@mark-bricks/(?!(editor/(font-families|marp)|image-path|marp-preview/(export|render))$)',
							message:
								'The extension host may import only the shared modules that run in Node without the DOM, React or Vite.',
						},
						{
							group: [
								'react',
								'react/*',
								'react-dom',
								'react-dom/*',
								'@wordpress/*',
							],
							message:
								'The extension host runs in Node, outside the webview.',
						},
					],
				},
			],
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
