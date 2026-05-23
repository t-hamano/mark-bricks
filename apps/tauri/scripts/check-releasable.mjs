import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = resolve( dirname( fileURLToPath( import.meta.url ) ), '..' );

// preversion guard. Releases must be cut on `main`. `npm version` happily bumps
// on any branch, so a release commit can land on a feature branch by mistake.
// Abort early when the current branch is not `main`.
const branch = execSync( 'git branch --show-current', {
	encoding: 'utf8',
} ).trim();
if ( branch !== 'main' ) {
	console.error(
		`\nReleases must be cut on "main" (current branch: "${
			branch || 'detached HEAD'
		}").\n` + 'Aborting the version bump.\n'
	);
	process.exit( 1 );
}

// preversion guard. `npm version` bumps the version unconditionally, so a
// release can be cut even when nothing user-facing changed (e.g. only
// ci/chore commits, or changes outside the tauri/editor paths). Reuse
// `version:preview` — the same conventional-changelog invocation and
// --commit-path filters as the real CHANGELOG — and abort the bump when it
// produces no releasable section.
const preview = execSync( 'pnpm --silent run version:preview', {
	cwd: rootDir,
	encoding: 'utf8',
} );

// The angular preset emits a `### <Type>` subsection (Features, Bug Fixes,
// Performance Improvements, BREAKING CHANGES, Reverts) only when at least one
// releasable commit exists. An empty bump yields just the version header
// (`#`/`##`), so no `### ` line appears.
if ( ! /^### /m.test( preview ) ) {
	console.error(
		'\nNo releasable changes for the tauri app since the last release.\n' +
			'Aborting the version bump to avoid an empty release.\n' +
			'Only feat/fix/perf/BREAKING commits touching apps/tauri or ' +
			'packages/editor count.\n'
	);
	process.exit( 1 );
}
