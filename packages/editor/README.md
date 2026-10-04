# @mark-bricks/editor

> [!NOTE]
> This is a private package. `@mark-bricks/editor` is not published to npm. It lives in this monorepo and is consumed by the hosts via pnpm's `workspace:` protocol

The host-agnostic React component package at the heart of MarkBricks. It minimizes and specializes the WordPress block editor for Markdown editing, and ships the matching blocks, formats, a Monaco-based source editor and i18n.

Hosts (the Tauri app, the VSCode extension, ...) consume this package and render one of its editor components, passing in only the host-specific configuration (content, settings, header actions) via props.

This package provides two main features:

- **Block editor** — the basic blocks and inline formats needed to author Markdown, plus the surrounding editing UI (block inserter, list view, document outline, keyboard shortcuts).
- **Source code editor** — a [Monaco Editor](https://microsoft.github.io/monaco-editor/)-based source editor for editing raw Markdown, configured by the host with Markdown-aware key bindings wired in on top.

They're exposed as two components, sharing the same header/footer/sidebars and undo history:

- **`<Editor />`** — both editors, switchable at runtime via `editorMode`. For hosts that let the user toggle between visual and source editing (the Tauri app).
- **`<BlockEditor />`** — the block editor only, with no switch to source editing. Its module never references the source editor, so hosts that only need visual editing (the VSCode extension) don't bundle Monaco.

## Entry points

- `@mark-bricks/editor`: the two components, plus what the entry points below export except `marp` and `katex-fonts`, and the keyboard shortcut hooks. It references the source editor, so it is for hosts that bundle it (the Tauri app).
- `@mark-bricks/editor/block-editor`: `<BlockEditor />`, without the source editor.
- `@mark-bricks/editor/setup`: `setupEditor`, which applies the locale and registers the blocks and inline formats. See [Localization](#localization).
- `@mark-bricks/editor/i18n`: `applyLocale` and `getLocale`. See [Localization](#localization).
- `@mark-bricks/editor/editor-theme-provider`: `EditorThemeProvider` and `useEditorTheme`. See [Appearance](#appearance).
- `@mark-bricks/editor/front-matter`: `useFrontMatter`, for host UI that reads or updates the document's YAML front matter.
- `@mark-bricks/editor/font-families`: `FONT_FAMILY_STACKS`, the font stacks the content area can be set to. It has no dependencies, so the VS Code extension host can load it to validate settings.
- `@mark-bricks/editor/marp`: `isMarpDocument`. It depends on neither React nor `@wordpress/*`, so the VS Code extension host can load it.
- `@mark-bricks/editor/katex-fonts`: `rewriteFontSources`, which points a KaTeX stylesheet at the bundled WOFF2 fonts. `@mark-bricks/marp-preview` uses it for the math in slides.
- `@mark-bricks/editor/code-previews`: `inspectCodePreviews`, which reports how the previews of the math and code blocks rendered, for the apps' smoke tests.

## Appearance

The editor supports light and dark modes through `EditorThemeProvider`. It uses `ThemeProvider` from `@wordpress/theme` to update WPDS design tokens for the selected theme.

Some Gutenberg components hard-code colors. These styles are overridden with WPDS design tokens to support dark mode.

## Localization

Localization is built on `@wordpress/i18n`. Dictionaries from `languages/mark-bricks-{locale}.json` are bundled at build time.

Call `setupEditor()` once at startup, before the editor renders and before any module that calls `__()` at module load is imported. It applies the locale with `applyLocale()`, then registers the blocks and inline formats, whose titles are translated at registration. Switching locale afterward requires an app restart.

`setupEditor()` takes a WordPress locale slug (e.g. `ja`, `pt_BR`) and applies it when a catalog for it exists, otherwise English, and resolves to the applied slug. The editor keeps no list of languages: choosing the slug is up to each host.

## Localization pipeline

The translation files in [`languages/`](./languages/) — the `mark-bricks.pot` template, the per-locale `mark-bricks-<locale>.po` sources, and the compiled `mark-bricks-<locale>.json` dictionaries — are built with the shared [`@mark-bricks/i18n-tools`](../i18n-tools/README.md) CLI, wired here as the `i18n:make-pot` / `i18n:make-po` / `i18n:make-json` scripts. See that package's README for the pipeline and the command reference.

```sh
# 1. Extract .pot after source changes
pnpm --filter @mark-bricks/editor i18n:make-pot
# 2. Sync .po against the .pot → translate the msgstr fields in mark-bricks-<locale>.po
pnpm --filter @mark-bricks/editor i18n:make-po
# 3. Build the .json dictionary
pnpm --filter @mark-bricks/editor i18n:make-json
```

Because the editor ships the WordPress block editor standalone, its `i18n:make-json` runs with `--gutenberg`: each `mark-bricks-<locale>.json` bundles both the `mark-bricks` domain (from the `.po`) and the `default` domain (Gutenberg strings fetched from `translate.wordpress.org`).

### Overriding translations

The `default` domain's msgids don't always match the bundled `@wordpress/*` packages, so some strings fall through untranslated. To patch them — or fix a `mark-bricks` string without rebuilding the `.po` — drop a `mark-bricks-override-<locale>.json` next to the dictionary. Same Jed format, merged on top per message, and it survives `i18n:make-json` re-runs.

```json
{
	"locale_data": {
		"mark-bricks": {
			"some app msgid": [ "corrected app translation" ]
		},
		"default": {
			"some gutenberg msgid": [ "corrected gutenberg translation" ]
		}
	}
}
```
