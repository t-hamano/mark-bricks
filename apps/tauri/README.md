# MarkBricks Desktop

Desktop application for MarkBricks. Built on Tauri 2 + Vite + React, it hosts the WordPress block editor exposed by `@mark-bricks/editor` and adapts it for editing local Markdown files. Persistence uses `tauri-plugin-store`, and file I/O goes through Rust commands plus `tauri-plugin-dialog`.

## Development

Run from the repository root:

```sh
# Start Vite + Tauri
pnpm dev:tauri

# Build the frontend and bundle Tauri
pnpm build:tauri

# Pass-through to the tauri CLI
pnpm tauri

# Bump the version (updates package.json / Cargo.toml / Cargo.lock / tauri.conf.json in one shot)
pnpm version:tauri <patch|minor|major>
```
