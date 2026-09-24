# MarkBricks VSCode extension

VSCode extension for MarkBricks. It registers a custom editor for `.md` files that embeds the WordPress block editor exposed by `@mark-bricks/editor`, so you can edit Markdown visually without leaving VSCode. Open a Markdown file and run **Open with MarkBricks** (or **Reopen Editor With...**) to switch to the visual editor; **Open with Text Editor** switches back.

## Install

Install [MarkBricks](https://marketplace.visualstudio.com/items?itemName=aki-hamano.mark-bricks-vscode) from the VSCode Marketplace, or run:

```sh
code --install-extension aki-hamano.mark-bricks-vscode
```

Each `vscode-v*` tag on the [Releases page](https://github.com/t-hamano/mark-bricks/releases) also carries the `.vsix`, for editors that can't reach the Marketplace. A `.vsix` install doesn't auto-update.

## Development

Run from this directory:

```sh
# Build the extension host and webview once
pnpm build

# Rebuild both on change
pnpm dev

# Package a .vsix (requires the build above)
pnpm package
```

To try changes without packaging, run `pnpm dev` and open an Extension Development Host via a `launch.json` with `"type": "extensionHost"` and `"args": ["--extensionDevelopmentPath=${workspaceFolder}/apps/vscode"]`, or `code --extensionDevelopmentPath=apps/vscode`.

From the repository root:

```sh
# Bump the extension version (npm version)
pnpm version:vscode
# Preview the next extension version
pnpm version:vscode:preview
```
