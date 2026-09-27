import { defineConfig } from '@vscode/test-cli';

export default defineConfig( {
	files: 'e2e/**/*.test.cjs',
	launchArgs: [ '--disable-extensions', '--disable-gpu' ],
	mocha: {
		// The webview has to load the whole block editor bundle.
		timeout: 120000,
	},
} );
