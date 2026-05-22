# MarkBricks

A visual Markdown editor powered by the WordPress block editor.

MarkBricks minimizes and specializes the WordPress block editor for Markdown editing, so you can write Markdown as visual blocks or as raw source — and switch between the two at any time.

## Download

Download the latest desktop app for your platform (Windows, macOS, or Linux) from the [latest release](https://github.com/t-hamano/mark-bricks/releases/latest). Older versions and release notes are on the [Releases page](https://github.com/t-hamano/mark-bricks/releases).

## Structure

This is a pnpm monorepo. The editor itself lives in a host-agnostic package that each host application consumes.

-   **[`packages/editor`](packages/editor)** — `@mark-bricks/editor`. The host-agnostic React component at the heart of MarkBricks. Ships the blocks, inline formats, a Monaco-based source editor, and i18n. Hosts render the `<Editor />` component and pass in only host-specific configuration.
-   **[`apps/tauri`](apps/tauri)** — Desktop application. Built on Tauri 2 + React, it hosts `@mark-bricks/editor` for editing local Markdown files.
-   **[`apps/vscode`](apps/vscode)** — VSCode extension. Embeds the editor as a custom editor for `.md` files. **Not yet implemented.**
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
