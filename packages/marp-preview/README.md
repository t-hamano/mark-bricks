# @mark-bricks/marp-preview

> [!NOTE]
> This is a private package. `@mark-bricks/marp-preview` is not published to npm. It lives in this monorepo and is consumed by the hosts via pnpm's `workspace:` protocol

Renders a Marp slide deck into the HTML and stylesheet of the hosts' slide previews, with [Marp Core](https://github.com/marp-team/marp-core). Each host passes a function that turns the deck's image sources into URLs its webview can load, points KaTeX's relative font URLs at the fonts it bundles, and runs Marp's browser script on the preview page.

It depends on neither the editor nor a bundler, so the VS Code extension host can load it.
