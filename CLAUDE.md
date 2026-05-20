## Commit messages

This repository enforces Conventional Commits via commitlint (commit-msg hook).
Always format commits as `type(scope): subject`.

-   Allowed types: `feat`, `fix`, `refactor`, `perf`, `docs`, `style`, `test`, `build`, `ci`, `chore`
-   Scope (optional but preferred): `tauri`, `vscode`, `editor`, `storybook`, `repo`
-   Subject: English, sentence-case (capitalize the first word), imperative mood, no trailing period
-   Breaking changes: add a `BREAKING CHANGE:` footer

Release commits are produced by `npm version` and formatted automatically as
`chore(release): <app> v<version>` — do not create release commits by hand.
