/**
 * A summary of the Marp syntax, added to the system prompt when the
 * document is a Marp slide deck. It follows Marpit and Marp Core, and covers
 * the parts the model tends to get wrong: the front matter, the scope of
 * directives, the classes each built-in theme styles, and image keywords.
 *
 * The text is fixed, so the prompt cache keeps it across requests.
 */
export const MARP_GUIDE = `<marp_guide>
This document is a Marp slide deck. Follow these Marp rules when you write or change it.

## Front matter
- The deck starts with front matter that contains \`marp: true\`. Keep that key. Example:
  ---
  marp: true
  theme: gaia
  paginate: true
  ---
- The values are YAML. Quote a value that contains ": " or starts with a character such as "#", "*" or "[", for example \`footer: "Q3: Results"\`.

## Slides
- A line of \`---\` separates slides. Put a blank line before and after it: directly under a paragraph, \`---\` turns that paragraph into a heading instead of starting a new slide.
- The closing \`---\` of the front matter does not separate slides. The first slide starts right after it.

## Directives
Directives are set in the front matter, or in an HTML comment such as \`<!-- paginate: true -->\`. One comment can hold several keys, one per line, in YAML. A directive comment can be anywhere in its slide, at the top, in the middle or at the bottom, and affects the whole slide.

Global directives set the whole deck, wherever they are written. When one is set more than once, the last value wins. Write them in the front matter.
- \`theme\`: \`default\`, \`gaia\` or \`uncover\`.
- \`size\`: \`16:9\` (the default) or \`4:3\`.
- \`headingDivider\`: a heading level, such as \`2\`, or a list of levels. Every heading at that level or higher starts a new slide, with no \`---\` needed.
- \`style\`: CSS for the whole deck.
- \`lang\`, and \`math\` (\`mathjax\` or \`katex\`).

Local directives set the slide where they are written and every slide after it, until they are set again. In the front matter they set every slide from the first.
- \`paginate\`: \`true\` shows the page number and \`false\` hides it. \`hold\` shows it without counting the slide, and \`skip\` hides it without counting the slide.
- \`header\` and \`footer\`: Markdown text shown at the top or bottom of the slide.
- \`class\`: classes on the slide, separated by spaces, such as \`lead invert\`.
- \`backgroundColor\`, \`backgroundImage\`, \`backgroundPosition\`, \`backgroundRepeat\`, \`backgroundSize\` and \`color\`: CSS values for the slide.

Spot directives: a local directive with a leading underscore, such as \`<!-- _class: lead -->\` or \`<!-- _paginate: false -->\`, sets only the slide where it is written. Use one for a change that belongs to one slide, such as a title slide. Without the underscore, the change carries on to every following slide.

## Theme classes
Each built-in theme styles only these classes:
- \`default\`: \`invert\` (dark colors).
- \`uncover\`: \`invert\`.
- \`gaia\`: \`invert\`, \`gaia\` (the theme's accent colors) and \`lead\` (centered content, for a title or section slide).
Do not use \`lead\` or \`gaia\` with the \`default\` or \`uncover\` theme: they have no effect there. Check the \`theme\` directive before adding a class.

## Images
Marp reads keywords from the image's alt text, separated by spaces, such as \`![bg left:40% contain](photo.jpg)\`. Words that are not keywords stay as the alt text.
- \`w:300px\` and \`h:200px\` (or \`width:\` and \`height:\`) set the size. A number alone means pixels. A percentage does not work for an image in the content.
- Filters: \`blur\`, \`brightness\`, \`contrast\`, \`drop-shadow\`, \`grayscale\`, \`hue-rotate\`, \`invert\`, \`opacity\`, \`saturate\` and \`sepia\`. Each takes an optional value after a colon, such as \`blur:5px\` or \`sepia:50%\`.
- \`bg\` makes the image the slide's background instead of part of the content. With \`bg\`:
  - \`cover\` fills the slide and is the default. \`contain\` or \`fit\` fits the whole image in the slide. \`auto\` keeps its own size. A percentage such as \`50%\` scales it.
  - \`left\` or \`right\` splits the slide: the image takes that side and the content takes the other. \`left:40%\` sets the image's share of the width.
  - Several \`bg\` images on one slide sit side by side. Add \`vertical\` to one of them to stack them instead.

## Scoped style
\`<style scoped>\` with CSS styles only the slide that contains it, such as \`<style scoped>section { font-size: 24px; }</style>\`. The selector \`section\` is the slide itself. A \`<style>\` without \`scoped\` styles every slide.

## Speaker notes
An HTML comment that is not a directive, such as \`<!-- Mention the release date. -->\`, is a speaker note for its slide and does not show on the slide.
</marp_guide>`;
