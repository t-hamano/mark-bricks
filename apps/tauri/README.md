# MarkBricks Desktop

Desktop application for MarkBricks. Built on Tauri 2 + Vite + React, it hosts the WordPress block editor exposed by `@mark-bricks/editor` and adapts it for editing local Markdown files. Persistence uses `tauri-plugin-store`, and file I/O goes through Rust commands plus `tauri-plugin-dialog`. It also provides the editor's AI assistant (see [AI assistant](#ai-assistant)).

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

# Preview the next version without bumping anything
pnpm version:tauri:preview
```

## AI assistant

The app provides `Platform.ai` to `@mark-bricks/editor`, which shows the AI assistant. It supports Anthropic, OpenAI, and Google Gemini, each with the user's own API key.

### Setting an API key

Open **Preferences → AI Assistant**, choose the provider, and enter its API key. The key is checked with the provider's API before it is saved. Each provider's card links to the page that creates API keys and the page that shows usage and billing. The tab also sets the model for each provider, listed from the provider's Models API, and custom instructions sent with every message. When no model is chosen or the list cannot be loaded, the adapter's `DEFAULT_MODEL` is used.

### How the key stays out of the webview

- The keys are stored in the OS credential store with the [`keyring`](https://crates.io/crates/keyring) crate, one per provider (`src-tauri/src/api_key.rs`), not in `tauri-plugin-store`, which writes plain JSON. The webview can save, delete, and check for a key, but never read it.
- The `ai_request` command sends the requests with [`reqwest`](https://crates.io/crates/reqwest) and adds the key there (`src-tauri/src/ai_request.rs`). It only sends them to the providers' API hosts (`api.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com`), streams the response back through a `Channel`, and can be cancelled. The webview's CSP `connect-src` does not allow these hosts.
- Only the main window can use the key. The preview and export windows, which render documents, cannot.

### Adding a provider

Each provider has an adapter in its own folder of `src/ai` that builds the requests and parses the streamed response. To add one, implement `AiProviderAdapter` (`src/ai/provider.ts`), list it in `src/ai/providers.ts`, and add it to the native side's `Provider` (`src-tauri/src/api_key.rs`) and to the URLs in `src-tauri/src/ai_request.rs`.
