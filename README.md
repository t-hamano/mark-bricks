<p align="center">
  <img src="apps/tauri/src/assets/app-icon.png" alt="MarkBricks" width="120" height="120" />
</p>

# MarkBricks

A visual Markdown editor that minimizes and specializes the WordPress block editor for Markdown editing.

## Products

MarkBricks is delivered as the following applications.

-   **MarkBricks Desktop** — A standalone desktop app for Windows, macOS, and Linux. Built on Tauri 2 + React, it edits local Markdown files with the WordPress block editor. Grab it from the [latest release](https://github.com/t-hamano/mark-bricks/releases/latest).
-   **MarkBricks VSCode extension** — A VSCode extension that embeds the editor as a custom editor for `.md` files, so you can edit Markdown visually without leaving your editor. **Not yet implemented.**

## Download

Download **MarkBricks Desktop** for your platform. Older versions and release notes are on the [Releases page](https://github.com/t-hamano/mark-bricks/releases).

| Platform | Download                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Windows  | <!-- download:windows -->[Installer (`.exe`)](https://github.com/t-hamano/mark-bricks/releases/download/tauri-v0.11.0/MarkBricks_0.11.0_x64-setup.exe)<!-- /download:windows --> |
| macOS    | <!-- download:macos -->[Disk image (`.dmg`)](https://github.com/t-hamano/mark-bricks/releases/download/tauri-v0.11.0/MarkBricks_0.11.0_universal.dmg)<!-- /download:macos -->    |
| Linux    | <!-- download:linux -->[AppImage](https://github.com/t-hamano/mark-bricks/releases/download/tauri-v0.11.0/MarkBricks_0.11.0_amd64.AppImage)<!-- /download:linux -->              |

## Structure

This is a pnpm monorepo. The editor itself lives in a host-agnostic package that each host application consumes.

-   **[`apps/tauri`](apps/tauri)** — Desktop application. Built on Tauri 2 + React, it hosts `@mark-bricks/editor` for editing local Markdown files.
-   **[`apps/vscode`](apps/vscode)** — VSCode extension. Embeds the editor as a custom editor for `.md` files. **Not yet implemented.**
-   **[`packages/editor`](packages/editor)** — `@mark-bricks/editor`. The host-agnostic React component at the heart of MarkBricks. Ships the blocks, inline formats, a Monaco-based source editor, and i18n.
-   **[`packages/i18n-tools`](packages/i18n-tools)** — `@mark-bricks/i18n-tools`. Shared i18n build tooling. Provides the `mb-i18n` CLI that runs the gettext PO/JSON pipeline.
-   **[`packages/fixtures`](packages/fixtures)** — `@mark-bricks/fixtures`. Shared Markdown fixtures consumed by Storybook, the round-trip tests, and manual smoke tests.
-   **[`storybook`](storybook)** — Storybook workspace for previewing the editor.

## Storybook

Here you can see the core `@mark-bricks/editor` in action.

<https://t-hamano.github.io/mark-bricks/>

## Development

Requires Node.js and [pnpm](https://pnpm.io/). Run any of the root scripts with `pnpm <script>`.

### Install

```sh
# Install dependencies
pnpm install
```

### Desktop app

```sh
# Start the desktop app in development (Vite + Tauri)
pnpm dev:tauri
# Build the frontend and bundle the desktop app
pnpm build:tauri
# Run the Tauri CLI in the desktop app
pnpm tauri
# Bump the desktop app version (npm version)
pnpm version:tauri
# Preview the next desktop app version
pnpm version:tauri:preview
```

### VSCode extension

```sh
# Bump the VSCode extension version (npm version)
pnpm version:vscode
# Preview the next VSCode extension version
pnpm version:vscode:preview
```

### Storybook

```sh
# Start Storybook
pnpm storybook
```

### i18n

```sh
# Extract translatable strings to .pot
pnpm i18n:make-pot
# Sync per-locale .po files
pnpm i18n:make-po
# Build the Jed-format .json dictionaries
pnpm i18n:make-json
```

### Test

```sh
# Run the test suites across packages
pnpm test
```

See each package's own README for details.

## License

[GPL-2.0-or-later](LICENSE) © Aki Hamano
