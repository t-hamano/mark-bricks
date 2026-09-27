import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig( {
	resolve: {
		alias: {
			// The real module only exists inside the extension host.
			vscode: fileURLToPath(
				new URL(
					'./src/extension/__mocks__/vscode.ts',
					import.meta.url
				)
			),
		},
	},
	test: {
		environment: 'node',
		include: [ 'src/extension/**/*.test.ts' ],
	},
} );
