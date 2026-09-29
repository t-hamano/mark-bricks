import { defineConfig, devices } from '@playwright/test';

/**
 * Visual regression tests against the static Storybook build.
 *
 * Screenshots depend on the fonts and rendering of the OS, so the baselines
 * are taken in the Playwright Docker image, both in CI and locally through
 * `pnpm test:visual:docker`.
 */
export default defineConfig( {
	testDir: './visual',
	snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
	forbidOnly: !! process.env.CI,
	reporter: 'list',
	use: {
		...devices[ 'Desktop Chrome' ],
		viewport: { width: 1280, height: 800 },
	},
	expect: {
		toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
	},
} );
