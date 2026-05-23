<p align="center">
  <img src="apps/tauri/src-tauri/app-icon.png" alt="MarkBricks" width="120" height="120" />
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
| Windows  | <!-- download:windows -->[Installer (`.exe`)](https://github.com/t-hamano/mark-bricks/releases/download/tauri-v0.5.1/MarkBricks_0.5.1_x64-setup.exe)<!-- /download:windows --> |
| macOS    | <!-- download:macos -->[Disk image (`.dmg`)](https://github.com/t-hamano/mark-bricks/releases/download/tauri-v0.5.1/MarkBricks_0.5.1_universal.dmg)<!-- /download:macos -->    |
| Linux    | <!-- download:linux -->[AppImage](https://github.com/t-hamano/mark-bricks/releases/download/tauri-v0.5.1/MarkBricks_0.5.1_amd64.AppImage)<!-- /download:linux -->              |

## Structure

This is a pnpm monorepo. The editor itself lives in a host-agnostic package that each host application consumes.

-   **[`apps/tauri`](apps/tauri)** — Desktop application. Built on Tauri 2 + React, it hosts `@mark-bricks/editor` for editing local Markdown files.
-   **[`apps/vscode`](apps/vscode)** — VSCode extension. Embeds the editor as a custom editor for `.md` files. **Not yet implemented.**
-   **[`packages/editor`](packages/editor)** — `@mark-bricks/editor`. The host-agnostic React component at the heart of MarkBricks. Ships the blocks, inline formats, a Monaco-based source editor, and i18n. Hosts render the `<Editor />` component and pass in only host-specific configuration.
-   **[`packages/i18n-tools`](packages/i18n-tools)** — `@mark-bricks/i18n-tools`. Private shared i18n build tooling. Provides the `mb-i18n` CLI that runs the gettext PO/JSON pipeline (extract `.pot` → sync per-locale `.po` → build the Jed-format `.json` dictionaries `@wordpress/i18n` loads), consumed by the hosts via pnpm's `workspace:` protocol.
-   **[`packages/fixtures`](packages/fixtures)** — `@mark-bricks/fixtures`. Shared Markdown fixtures consumed by Storybook, the round-trip tests, and manual smoke tests.
-   **[`storybook`](storybook)** — Storybook workspace for previewing the editor.

## Storybook

<https://t-hamano.github.io/mark-bricks/>

## Development

Requires Node.js and [pnpm](https://pnpm.io/).

```sh
pnpm install            # Install dependencies
pnpm dev:tauri          # Start the desktop app (Vite + Tauri)
pnpm build:tauri        # Build the frontend and bundle the desktop app
pnpm lint               # Lint JS/TS and CSS
pnpm type-check         # Type-check all packages
```

See each package's own README for details.

## License

[GPL-2.0-or-later](LICENSE) © Aki Hamano
