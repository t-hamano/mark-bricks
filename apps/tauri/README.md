# MarkBricks Desktop

Desktop application for MarkBricks. Built on Tauri 2 + React, it hosts the WordPress block editor exposed by `@mark-bricks/editor` and adapts it for editing local Markdown files.

## Stack

-   Tauri 2 + Vite + React
-   Frontend: TypeScript / SCSS
-   Persistence: `tauri-plugin-store`
-   File I/O: Rust commands (`read_text_file` / `write_text_file`) + `tauri-plugin-dialog`

## File operations

`@mark-bricks/editor` is host-agnostic, so file I/O is implemented entirely in this app under `src/actions/file.ts` and triggered from the host-owned UI (header buttons, keyboard shortcuts, tab close):

-   `newFile` / `openFile` / `saveActiveFile` / `saveActiveFileAs` / `requestCloseActiveTab`

## Development

Run from the repository root:

```sh
npm run dev:tauri      # Start Vite + Tauri
npm run build:tauri    # Build the frontend and bundle Tauri
npm run tauri          # Pass-through to the tauri CLI
```

Bumping the version:

```sh
npm version <patch|minor|major> -w apps/tauri
# Updates package.json / Cargo.toml / Cargo.lock / tauri.conf.json in one shot
```
