# @mark-bricks/marp-preview

> [!NOTE]
> This is a private package. `@mark-bricks/marp-preview` is not published to npm. It lives in this monorepo and is consumed by the hosts via pnpm's `workspace:` protocol

Renders a Marp slide deck into the HTML and stylesheet of the hosts' slide previews, with [Marp Core](https://github.com/marp-team/marp-core), and shows them on the preview pages.

## Entry points

### `@mark-bricks/marp-preview`

Turns a deck's Markdown into the slides' HTML and stylesheet with `renderSlides`. Where it runs differs per host: the Tauri app calls it on its preview page, and the VS Code extension calls it in the extension host and posts the result to the preview webview.

- Renders the deck the way the official Marp tools do, but leaves out Marp's inline browser script, which the hosts' CSP refuses, and the theme's web font `@import`, which the hosts bundle instead.
- Takes a function that turns each image source in the deck into a URL the preview can load, since each host serves local files differently.
- Leaves KaTeX's font URLs relative, for the preview page to point them at the fonts it bundles.

It uses neither the DOM nor bundler-specific imports, so the VS Code extension host, bundled with esbuild, can load it.

### `@mark-bricks/marp-preview/browser`

Shows the rendered slides on the hosts' preview pages. It imports stylesheets, fonts and Vite's `?url` assets, so only the preview pages, built with Vite, import it. Never import it from the VS Code extension host.

- `createSlideView( container, onRender )` adds the slides in a scrolling column, or a notice in place of them for a document that is not a Marp deck. It shows the latest content at most once per frame, however often it arrives, and takes a function to defer rendering the deck to that frame. It runs Marp's browser script, points KaTeX at the fonts the page bundles, and loads the web fonts of the Gaia theme.
- `createSlideMode( view, onSlideChange )` presents the slides one at a time, starting from the one most visible in the column, and moves between them with the arrow, Page Up, Page Down, Home and End keys and the wheel. Leaving it scrolls the column back to the slide shown last. Outside the slide mode, it tracks the slide most visible in the column, for a pager to show.

Each host keeps how its page receives the slides, its own colors, and how to turn the slide mode on and off: the Tauri app ties it to the window's full screen.
