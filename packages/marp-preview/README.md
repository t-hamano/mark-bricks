# @mark-bricks/marp-preview

> [!NOTE]
> This is a private package. `@mark-bricks/marp-preview` is not published to npm. It lives in this monorepo and is consumed by the hosts via pnpm's `workspace:` protocol

Renders a Marp slide deck into the HTML and stylesheet of the hosts' slide previews, with [Marp Core](https://github.com/marp-team/marp-core), and shows them on the preview pages. It also renders decks for the hosts' exports, so both apps export the same files.

## Entry points

- `@mark-bricks/marp-preview/render`: `renderSlides`, for the hosts. Each host passes a function that turns the deck's image sources into URLs its preview can load. It depends on neither the editor nor a bundler, so the VS Code extension host can load it.
- `@mark-bricks/marp-preview/export`: for the hosts' exports. Like `render`, it depends on neither the editor nor a bundler.
    - `renderHtmlDocument` renders a deck into a standalone HTML page, as Marp CLI's `bare` template does. Image sources stay as written in the deck, and the page reads its title, language and other metadata from the deck's global directives. The page also gets the preview's toolbar and slide mode, in the language of the reader's browser: `F` and the toolbar's button turn the slide mode on and off, with full screen where the browser allows it.
    - `getDeckInfo` returns that metadata and the slide size, for a host that renders the PDF itself.
    - `createExportMarp` creates the Marp instance behind both. Marp CLI's functional engine (`--engine`) is built on it: the host bundles a module whose default export calls it, so Marp CLI renders with the same Marp Core version and options.
- `@mark-bricks/marp-preview/browser`: `createSlideView`, for a host page that shows the slides without the preview's controls, such as one that prints them. It adds a column of slides, with the fonts the built-in themes use, KaTeX's fonts and Marp's browser script, and calls back each time it shows new content. `createSlideMode` adds the slide mode to it.
- `@mark-bricks/marp-preview/controls`: `createSlidePreview`, for the preview pages. It sets up a preview page: the slides with their controls and the slide mode, which the toolbar's button, `F` and `Escape` turn on and off. A host can add toggle keys, and handle the requests to turn the slide mode on and off itself, such as to enter full screen with it.

## The script of exported pages

`renderHtmlDocument` inlines a script and a stylesheet into each page, built from `src/export/runtime`: the toolbar, the slide mode from `src/browser` and the strings of every locale. `pnpm build` bundles them into `dist/runtime.ts`, which is gitignored. `pnpm install` runs it after compiling the strings, so run it again only after changing `src/export/runtime`, `src/browser` or the translations:

```sh
pnpm --filter @mark-bricks/marp-preview build
```

The bundle renders the toolbar with [Preact](https://preactjs.com/) in place of React, which keeps the page small. The tests run the same code with React.
