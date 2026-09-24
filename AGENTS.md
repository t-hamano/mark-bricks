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
