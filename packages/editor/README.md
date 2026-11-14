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

- `@mark-bricks/editor`: the two components, `setupEditor` and `getLocale` (see [Localization](#localization)), `EditorThemeProvider` and `useEditorTheme` (see [Appearance](#appearance)), `useFrontMatter`, the keyboard shortcut hooks, and `inspectCodePreviews` for the apps' smoke tests. The package declares its side effects, so a bundler leaves out what a host does not import: a host that renders only `<BlockEditor />` does not bundle Monaco.
- `@mark-bricks/editor/ai`: the edit tool and the types a host needs to connect the AI assistant to a model. It depends on neither React nor `@wordpress/*`.
- `@mark-bricks/editor/code-preview-report`: the type of what `inspectCodePreviews` reports. It uses no DOM types, so the VS Code extension host can use it.
- `@mark-bricks/editor/font-families`: `FONT_FAMILIES` and `isFontFamily`, the font families the content area can be set to. It has no dependencies, so the VS Code extension host can load it to validate settings.
- `@mark-bricks/editor/marp`: `isMarpDocument`. It depends on neither React nor `@wordpress/*`, so the VS Code extension host can load it.
- `@mark-bricks/editor/marp-patterns`: the slide patterns, for Storybook.
- `@mark-bricks/editor/vite-dedupe`: the packages each app's Vite config resolves from the app root.

The VS Code extension host may import only the entry points that need neither the DOM nor React; lint enforces it.

## Source lines

Both components link the selected block to the lines of the document as `content` writes it, counted from 0 with the front matter's lines, for a host that follows it elsewhere, such as in a slide preview. `onSelectedLineChange` reports the line that the selected top-level block starts at whenever it changes, or `null` when no block is selected or the code editor is shown. The handle's `selectLine` selects the top-level block that shows a line and scrolls it into view.

## AI assistant

The AI assistant appears only when the host passes `ai` in its `Platform`, which sends the requests and keeps the API key.

## Appearance

The editor supports light and dark modes through `EditorThemeProvider`. It uses `ThemeProvider` from `@wordpress/theme` to update WPDS design tokens for the selected theme.

Some Gutenberg components hard-code colors. These styles are overridden with WPDS design tokens to support dark mode.

## Localization

Localization is built on `@wordpress/i18n`. Dictionaries from `languages/mark-bricks-{locale}.json` are bundled at build time.

Call `setupEditor()` once at startup, before the editor renders and before any module that calls `__()` at module load is imported. It applies the locale, then registers the blocks and inline formats, whose titles are translated at registration. Switching locale afterward requires an app restart.

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
