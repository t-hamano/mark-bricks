## Commit messages

This repository enforces Conventional Commits via commitlint (commit-msg hook).
Always format commits as `type(scope): subject`.

- Allowed types: `feat`, `fix`, `refactor`, `perf`, `docs`, `style`, `test`, `build`, `ci`, `chore`
- Scope (optional but preferred): `tauri`, `vscode`, `editor`, `storybook`, `repo`
- Subject: English, lower-case, imperative mood, no trailing period
- Breaking changes: add a `BREAKING CHANGE:` footer
    - Do not use the `type(scope)!:` header form. The changelog's angular preset cannot parse it and drops the commit.
    - Do not add trailers such as `Co-Authored-By:` to these commits. Everything after `BREAKING CHANGE:` ends up in the changelog note.

Release commits are produced by `npm version` and formatted automatically as
`chore(release): <app> v<version>` — do not create release commits by hand.

### The `refactor` type

Be careful with `refactor` in commit and PR titles: the apps' changelogs leave
it out. PRs are squash-merged, so the PR title becomes the commit the
changelog reads. When a change affects behavior or what users see, even
slightly:

- Suggest committing the pure refactoring first, on its own, and the change
  users notice in a follow-up commit/PR.
- Otherwise, use the type that fits the change, such as `fix` or `feat`,
  instead of `refactor`.

## Changes spanning an app and shared packages

Each app's changelog collects commits touching its own directory plus the
shared packages (`packages/editor`, `packages/image-path`,
`packages/marp-preview`). A single commit that changes both an app
(`apps/tauri` or `apps/vscode`) and a shared package therefore appears in the
other app's changelog too, even when the change only matters to one app.

When a task for one app requires modifying a shared package:

- Warn the user about this before making the change.
- Suggest splitting the shared-package change into its own commit and PR, landed
  first, and making the app-specific change in a follow-up commit/PR.
