# @mark-bricks/editor

The host-agnostic React component package at the heart of MarkBricks. It minimizes and specializes the WordPress block editor for Markdown editing, and ships the matching blocks, formats, a Monaco-based source editor and i18n.

Hosts (the Tauri app, the VSCode extension, ...) consume this package and render the `<Editor />` component, passing in only the host-specific configuration (content, settings, header actions) via props.

> [!NOTE]
> This is a private package. `@mark-bricks/editor` is not published to npm. It lives in this monorepo and is consumed by the hosts via pnpm's `workspace:` protocol — the usage examples below document the `<Editor />` API for those in-repo hosts, not an installable package.

## What it provides

### Block editor

Provides the basic blocks and inline formats needed to author Markdown. It also ships the surrounding editing UI — block inserter, list view, document outline, and keyboard shortcuts — so hosts get a full Markdown editing experience out of the box.

### Source code editor

A [Monaco Editor](https://microsoft.github.io/monaco-editor/)-based source editor is bundled alongside the block editor for editing raw Markdown. Its appearance and behavior are configured by the host, and Markdown-aware key bindings are wired in on top of Monaco.

## Usage

Import the `<Editor />` component, hold the Markdown content in host state, and feed it back through `content` / `onChange`.

```tsx
import { useState } from 'react';
import { Editor } from '@mark-bricks/editor';

function App() {
	const [ content, setContent ] = useState( '# Hello, MarkBricks' );

	return <Editor content={ content } onChange={ setContent } />;
}
```

To switch between the block editor and the Monaco source editor, own `editorMode` in host state and pass `onEditorModeChange`:

```tsx
import { useState } from 'react';
import { Editor } from '@mark-bricks/editor';

function App() {
	const [ content, setContent ] = useState( '' );
	const [ editorMode, setEditorMode ] = useState< 'visual' | 'text' >(
		'visual'
	);

	return (
		<Editor
			content={ content }
			onChange={ setContent }
			editorMode={ editorMode }
			onEditorModeChange={ setEditorMode }
			settings={ { fixedToolbar: true } }
			editorStyles={ { contentWidth: 800 } }
		/>
	);
}
```

## Props

### `content`: `string`

Current Markdown content.

-   Required: Yes

### `onChange`: `( content: string ) => void`

Called whenever the user edits the document.

-   Required: Yes

### `editorMode`: `'visual' | 'text'`

Selects between the block editor (`visual`) and the Monaco source editor (`text`).

-   Required: No
-   Default: `'visual'`

### `onEditorModeChange`: `Dispatch< SetStateAction< 'visual' | 'text' > >`

Setter for `editorMode`. Pass this when the host owns `editorMode` in state so the editor's own mode-switching UI can update it.

-   Required: No

### `settings`: `object`

Optional editor configuration. All fields are individually optional; omitted fields fall back to built-in defaults.

-   Required: No

#### `settings.showListViewByDefault`: `boolean`

Opens the list view sidebar on mount.

-   Required: No
-   Default: `false`

#### `settings.fixedToolbar`: `boolean`

Pins the block toolbar to the top of the editor instead of letting it float per block.

-   Required: No
-   Default: `false`

#### `settings.focusMode`: `boolean`

Enables focus mode, which dims non-focused blocks.

-   Required: No
-   Default: `false`

#### `settings.spellCheck`: `boolean`

Toggles the browser spellchecker on the visual canvas.

-   Required: No
-   Default: `false`

#### `settings.codeEditor`: `Partial<CodeEditorSettings>`

Monaco source editor settings. All fields are individually optional; omitted fields fall back to the defaults shown below.

-   Required: No

| Field             | Type                                            | Default | Description                                                               |
| ----------------- | ----------------------------------------------- | ------- | ------------------------------------------------------------------------- |
| `theme`           | `'vs' \| 'vs-dark' \| 'hc-light' \| 'hc-black'` | `'vs'`  | Monaco theme id: Light / Dark / High Contrast Light / High Contrast Dark. |
| `fontSize`        | `number`                                        | `14`    | Editor font size in pixels.                                               |
| `tabSize`         | `number`                                        | `4`     | Number of spaces inserted per Tab.                                        |
| `showLineNumbers` | `boolean`                                       | `true`  | Show the gutter line numbers.                                             |

### `headerActions`: `ReactNode`

Custom content rendered in the editor header.

-   Required: No

### `editorStyles`: `object`

Visual canvas styling. All fields are optional.

-   Required: No

| Field          | Type     | Default | Description                                                          |
| -------------- | -------- | ------- | -------------------------------------------------------------------- |
| `contentWidth` | `number` | `700`   | Maximum width of the content area, in pixels.                        |
| `fontSize`     | `number` | `13`    | Base font size of the content area, in pixels.                       |
| `fontFamily`   | `string` | —       | CSS `font-family` stack applied to the content area.                 |
| `css`          | `string` | —       | Extra CSS injected into the canvas iframe, for theming the document. |

### `style`: `CSSProperties`

Inline style applied to the outer container. The editor fills its parent's height by default; use this to override sizing or add other styling.

-   Required: No

### `platform`: `object`

Host integration callbacks for environment-specific operations (file pickers, path resolution). The editor stays environment-agnostic and only invokes these; each host injects its own implementation. All fields are optional; omitted fields fall back to no-op defaults.

-   Required: No

| Field             | Type                                    | Description                                                                           |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| `pickImageFile`   | `() => Promise< string \| null >`       | Opens a native image file picker; resolves with the stored path, or `null` on cancel. |
| `resolveImageSrc` | `( path: string ) => Promise< string >` | Converts a stored path into a URL the current webview can render in an `<img>` tag.   |

## Localization

Localization is built on `@wordpress/i18n`. Dictionaries from `languages/mark-bricks-{locale}.json` are bundled at build time.

Call `applyLocale()` once at startup, before the editor renders and before any module that calls `__()` at module load is imported. Switching locale afterward requires an app restart.

```tsx
import { useState, type ChangeEvent } from 'react';
import { createRoot } from 'react-dom/client';
import {
	Editor,
	LOCALES,
	applyLocale,
	getLocale,
	type Locale,
} from '@mark-bricks/editor';

// Apply the locale before anything renders. Unknown values fall back to
// navigator.language, then 'en'. applyLocale returns the resolved Locale.
const locale: Locale = applyLocale( localStorage.getItem( 'locale' ) );
document.documentElement.lang = locale;

function App() {
	const [ content, setContent ] = useState( '# Hello, MarkBricks' );

	// Switching locale requires re-running applyLocale at startup, so persist
	// the choice and reload.
	const onLocaleChange = ( e: ChangeEvent< HTMLSelectElement > ) => {
		localStorage.setItem( 'locale', e.target.value );
		window.location.reload();
	};

	return (
		<>
			<select defaultValue={ getLocale() } onChange={ onLocaleChange }>
				{ LOCALES.map( ( { code, name } ) => (
					<option key={ code } value={ code }>
						{ name }
					</option>
				) ) }
			</select>
			<Editor content={ content } onChange={ setContent } />
		</>
	);
}

createRoot( document.getElementById( 'root' )! ).render( <App /> );
```

## Localization pipeline

Translatable strings flow from source to bundled dictionary: `__()` calls in the source are extracted into a `.pot` template, translators fill in the per-locale `.po` files, and those are combined into the `mark-bricks-{locale}.json` dictionaries the editor loads at runtime.

All translation files live in [`languages/`](./languages/):

| File                                 | Role                                                                                                                   | Generated by     |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `mark-bricks.pot`                    | Translation template — the source of truth for which strings exist                                                     | `i18n:make-pot`  |
| `mark-bricks-<locale>.po`            | Per-locale translation source, edited by humans                                                                        | `i18n:make-po`   |
| `mark-bricks-<locale>.json`          | Jed-format runtime dictionary: the `mark-bricks` domain (from the `.po`) plus the `default` domain (Gutenberg strings) | `i18n:make-json` |
| `mark-bricks-override-<locale>.json` | Optional manual overrides for either domain                                                                            | edited by humans |

```sh
pnpm --filter @mark-bricks/editor i18n:make-pot   # 1. Extract .pot after source changes
pnpm --filter @mark-bricks/editor i18n:make-po    # 2. Sync .po against the .pot
#    → translate the msgstr fields in mark-bricks-<locale>.po
pnpm --filter @mark-bricks/editor i18n:make-json  # 3. Build the .json dictionary
```

`i18n:make-po` keeps only entries present in the POT and preserves existing non-empty translations; `i18n:make-json` converts the `.po` and fetches the `default` (Gutenberg) domain from `translate.wordpress.org`.

### Adding a new locale

Pass a WordPress locale slug (e.g. `ja`, `pt_BR`, `de_DE`, `zh_CN` — see the [WordPress locale list](https://translate.wordpress.org/locale/)) to the `i18n:make-*` commands; they default to `ja`.

```sh
pnpm --filter @mark-bricks/editor i18n:make-po <locale>    # create an empty .po
#    → translate mark-bricks-<locale>.po
pnpm --filter @mark-bricks/editor i18n:make-json <locale>  # build the dictionary
```

### Overriding translations

The `default` domain is fetched from WordPress.org, but its msgids do not always match the `@wordpress/*` packages bundled into the app; mismatched strings fall through untranslated. To patch them — or to fix a `mark-bricks` string without rebuilding the `.po` — drop a `mark-bricks-override-<locale>.json` next to the dictionary. It uses the same Jed format, is merged on top at the message level, and survives `i18n:make-json` re-runs.

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
