# @mark-bricks/editor

> [!NOTE]
> This is a private package. `@mark-bricks/editor` is not published to npm. It lives in this monorepo and is consumed by the hosts via pnpm's `workspace:` protocol

The host-agnostic React component package at the heart of MarkBricks. It minimizes and specializes the WordPress block editor for Markdown editing, and ships the matching blocks, formats, a Monaco-based source editor and i18n.

Hosts (the Tauri app, the VSCode extension, ...) consume this package and render the `<Editor />` component, passing in only the host-specific configuration (content, settings, header actions) via props.

This package provides two main features:

-   **Block editor** — the basic blocks and inline formats needed to author Markdown, plus the surrounding editing UI (block inserter, list view, document outline, keyboard shortcuts).
-   **Source code editor** — a [Monaco Editor](https://microsoft.github.io/monaco-editor/)-based source editor for editing raw Markdown, configured by the host with Markdown-aware key bindings wired in on top.

## Localization

Localization is built on `@wordpress/i18n`. Dictionaries from `languages/mark-bricks-{locale}.json` are bundled at build time.

Call `applyLocale()` once at startup, before the editor renders and before any module that calls `__()` at module load is imported. Switching locale afterward requires an app restart.

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
