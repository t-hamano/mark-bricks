# MarkBricks

Edit Markdown visually in VSCode with the WordPress block editor. MarkBricks opens `.md` files in a visual editor where every paragraph, heading, list, and code fence is a block you can move, transform, and format. It saves the result back as plain Markdown.

## Features

### Block-based editing

![Block-based editing](https://github.com/t-hamano/mark-bricks/raw/HEAD/.github/assets/feature-block-based-editing.png)

Every Markdown element is a block you can drag, reorder, duplicate, or transform. The List View and Outline show the document structure. Files stay plain `.md`, and the editor keeps the syntax you chose (`*` or `_`, `-` or `*`, backtick or tilde fences), so saving never rewrites a file.

### Live preview for diagrams and math

![Live preview for diagrams and math](https://github.com/t-hamano/mark-bricks/raw/HEAD/.github/assets/feature-live-preview-for-diagrams-and-math.png)

Mermaid diagrams and TeX math (rendered with KaTeX) preview right in the document and update as you type. Select the block to edit its source, and click away to see only the result. Math is saved as `$$`, which GitHub, VS Code, and Marp also display. Other code blocks get syntax highlighting.

### Front matter and GitHub-style alerts

![Front matter and GitHub-style alerts](https://github.com/t-hamano/mark-bricks/raw/HEAD/.github/assets/feature-front-matter-and-github-style-alerts.png)

YAML front matter and GitHub-style alerts (`> [!NOTE]`) can be edited in the visual editor too.

### Light and dark themes, in your language

![Light and dark themes, in your language](https://github.com/t-hamano/mark-bricks/raw/HEAD/.github/assets/feature-light-and-dark-themes-in-your-language.png)

The editor follows your VSCode theme, or you can pin it to light or dark with the `markBricks.theme` setting. The interface is translated into 13 languages.

## Usage

Open a Markdown file, then run **Open with MarkBricks** from the Command Palette. To go back to the source, run **Open with Text Editor**.

![Open with MarkBricks in the Command Palette](https://github.com/t-hamano/mark-bricks/raw/HEAD/.github/assets/usage-command-palette.jpg)

You can also switch editors from the editor title bar. To open every Markdown file in MarkBricks by default, choose **Set Default for '\*.md'** > **Visual Editor - MarkBricks** there.

![Setting MarkBricks as the default editor for Markdown files](https://github.com/t-hamano/mark-bricks/raw/HEAD/.github/assets/usage-set-default-editor.jpg)

## Settings

- `markBricks.showListViewByDefault`: Open the List View panel by default. Default: `false`
- `markBricks.showBlockBreadcrumbs`: Display the block hierarchy trail at the bottom of the editor. Default: `true`
- `markBricks.topToolbar`: Access all block and document tools in a single place. Default: `false`
- `markBricks.spotlightMode`: Focus on one block at a time. Default: `false`
- `markBricks.contentWidth`: Maximum width of the content area, in pixels (400–1600). Default: `700`
- `markBricks.fontSize`: Base font size of the content area, in pixels (10–24). Default: `13`
- `markBricks.fontFamily`: Typeface used for the content area: `system`, `sans-serif`, `serif`, `monospace`, or `handwriting`. Default: `system`
