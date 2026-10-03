# @mark-bricks/marp-preview

> [!NOTE]
> This is a private package. `@mark-bricks/marp-preview` is not published to npm. It lives in this monorepo and is consumed by the hosts via pnpm's `workspace:` protocol

Renders a Marp slide deck into the HTML and stylesheet of the hosts' slide previews, with [Marp Core](https://github.com/marp-team/marp-core), and shows them on the preview pages.

## Entry points

- `@mark-bricks/marp-preview/render`: `renderSlides` and the `PreviewLabels` type, for the hosts. Each host passes a function that turns the deck's image sources into URLs its preview can load. It depends on neither the editor nor a bundler, so the VS Code extension host can load it.
- `@mark-bricks/marp-preview/controls`: `createSlidePreview`, for the preview pages. It sets up a preview page: the slides with their controls and the slide mode, which the toolbar's button, `F` and `Escape` turn on and off. A host can add toggle keys, and handle the requests to turn the slide mode on and off itself, such as to enter full screen with it.

The preview pages set their colors through the custom properties listed at the top of `browser/style.css`.
