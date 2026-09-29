import { defineConfig } from 'vitest/config';

export default defineConfig( {
	test: {
		// Stylesheets load as empty strings by default. KaTeX's is read by
		// the test that checks its font sources are rewritten.
		css: { include: [ /katex/ ] },
	},
} );
