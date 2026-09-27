# @mark-bricks/image-path

> [!NOTE]
> This is a private package. `@mark-bricks/image-path` is not published to npm. It lives in this monorepo and is consumed by the hosts via pnpm's `workspace:` protocol

Parses an image path or URL from Markdown into a web URL, an absolute path, a `/`-rooted path or a relative path, with the path percent-decoded. Each host resolves the result against the document and turns it into a URL its webview can load: the VS Code extension with `vscode.Uri` and `asWebviewUri`, and the Tauri app with `convertFileSrc`.

It has no dependencies, so the VS Code extension host can load it without pulling in the editor.
