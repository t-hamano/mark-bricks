# @mark-bricks/marp-preview

> [!NOTE]
> This is a private package. `@mark-bricks/marp-preview` is not published to npm. It lives in this monorepo and is consumed by the hosts via pnpm's `workspace:` protocol

Renders a Marp slide deck into the HTML and stylesheet of the hosts' slide previews, with [Marp Core](https://github.com/marp-team/marp-core), and shows them on the preview pages.

## Entry points

- `@mark-bricks/marp-preview`: `renderSlides`, for the hosts. Each host passes a function that turns the deck's image sources into URLs its preview can load. It depends on neither the editor nor a bundler, so the VS Code extension host can load it.
- `@mark-bricks/marp-preview/browser`: for the preview pages, built with Vite. Never import it from the VS Code extension host.
    - `createSlideView` shows the slides in a scrolling column, or a notice in place of them, at most once per frame. It runs Marp's browser script, points KaTeX at the fonts the page bundles, and loads the web fonts of the Gaia theme.
    - `createSlideMode` presents the slides one at a time, and moves between them with the keyboard and the wheel. Each host decides how to turn it on and off.
- `@mark-bricks/marp-preview/controls`: for the preview pages that show controls over the slides. Kept apart from `./browser`, since it needs React, `@wordpress/ui` and `@wordpress/theme`.
    - `createPreviewControls` adds a toolbar with a pager and a button that toggles the slide mode, and a hint on how to leave the slide mode. The host translates the labels, since the preview pages load no translations.

The preview pages set their colors and fonts through the custom properties listed at the top of `browser/style.css`.
