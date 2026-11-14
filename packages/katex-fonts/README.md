# @mark-bricks/katex-fonts

> [!NOTE]
> This is a private package. `@mark-bricks/katex-fonts` is not published to npm. It lives in this monorepo and is consumed by the other packages via pnpm's `workspace:` protocol

Points KaTeX's stylesheet at the WOFF2 fonts the hosts bundle, in place of the relative `fonts/` URLs, which do not resolve in the apps. `@mark-bricks/editor` uses it for the math blocks, and `@mark-bricks/marp-preview` for the math in slides.

## Entry point

- `@mark-bricks/katex-fonts`: `KATEX_FONT_URLS`, the URL of each font as the bundler resolves it, and `rewriteFontSources`, which points a KaTeX stylesheet at them, or at the URLs passed.
