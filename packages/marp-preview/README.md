# @mark-bricks/marp-preview

> [!NOTE]
> This is a private package. `@mark-bricks/marp-preview` is not published to npm. It lives in this monorepo and is consumed by the hosts via pnpm's `workspace:` protocol

Renders a Marp slide deck into the HTML and stylesheet of the hosts' slide previews, with [Marp Core](https://github.com/marp-team/marp-core), and shows them on the preview pages. It also renders decks for the hosts' exports, so both apps export the same files.

## Entry points

- `@mark-bricks/marp-preview/render`: `renderSlides`, for the hosts. Each host passes a function that turns the deck's image sources into URLs its preview can load. It depends on neither the editor nor a bundler, so the VS Code extension host can load it.
- `@mark-bricks/marp-preview/export`: for the hosts' exports. Like `render`, it depends on neither the editor nor a bundler.
    - `renderHtmlDocument` renders a deck into a standalone HTML page, as Marp CLI's `bare` template does. Image sources stay as written in the deck, and the page reads its title, language and other metadata from the deck's global directives.
    - `getDeckInfo` returns that metadata and the slide size, for a host that renders the PDF itself.
    - `createExportMarp` creates the Marp instance behind both. It also serves as Marp CLI's functional engine (`--engine`), so Marp CLI renders with the same Marp Core version and options.
- `@mark-bricks/marp-preview/controls`: `createSlidePreview`, for the preview pages. It sets up a preview page: the slides with their controls and the slide mode, which the toolbar's button, `F` and `Escape` turn on and off. A host can add toggle keys, and handle the requests to turn the slide mode on and off itself, such as to enter full screen with it.
