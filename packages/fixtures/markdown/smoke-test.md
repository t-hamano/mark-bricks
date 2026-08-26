# Markdown editor

A sample document that showcases every block and text format you can use.

## Headings

### Heading level 3

#### Heading level 4

##### Heading level 5

###### Heading level 6

### A heading with **bold**, *italic* and `code`

## Inline formatting

This paragraph has *emphasis*, **strong**, `inline code`, ~~strikethrough~~
and a [link](https://example.com).

The underscore spellings: _emphasis_ and __strong__.

Both spellings in one line: *asterisk* and _underscore_, **asterisk** and
__underscore__.

A link [with a title](https://example.com "Example title") too.

Strong wrapping emphasis: **bold with *italic* inside**.

A link wrapping formatting: [**bold** and *italic* link](https://example.com).

Strong wrapping code: **bold with `code` inside**.

Deeply nested: **bold *italic ~~struck~~* end**.

A hard break ends this line\
and the text continues here.

## Edge cases

A literal asterisk: \*not emphasis\* and a literal underscore: \_not emphasis\_.

HTML special characters in text: a < b, x > y, AT\&T.

Inline code containing markdown: `**not bold** *not italic*`.

Inline code containing backticks: ``code with a ` backtick``.

Inline code containing HTML: `<div class="x">`.

## Unordered list

- First item
- Second item with *emphasis* and `code`
  - Nested item
  - Another nested item
    - Deeply nested item
- Third item

## Ordered list

1. Ordered item one
2. Ordered item two
   1. Nested ordered item
   2. Another nested ordered item
3. Ordered item three

## Task list

- [x] Completed task
- [ ] Pending task with a [link](https://example.com)
- [ ] Pending task with **bold**

## Blockquote

> A plain quote with *emphasis*, **strong** and a
> [link](https://example.com).
>
> > Nested quote with **bold *italic***.

## Quote alerts

> [!NOTE]
> Useful information that users should know, even when skimming.

> [!TIP]
> Helpful advice for doing things more easily.

> [!IMPORTANT]
> Key information users need to know to achieve their goal.

> [!WARNING]
> Urgent info that needs immediate user attention to avoid problems.

> [!CAUTION]
> Advises about risks or negative outcomes of certain actions.

## Code

```js
function greet( name ) {
	const message = `Hello, ${ name }!`;
	console.log( message );
	return message;
}
```

```python
def fibonacci(limit):
    a, b = 0, 1
    while a < limit:
        yield a
        a, b = b, a + b
```

```
plain code block without a language
```

## Image

![A mountain landscape](https://picsum.photos/id/1018/800/400 'Lorem Picsum')

## Table

| Block   | Markdown syntax | Notes                |
| ------- | --------------- | -------------------- |
| Heading | `# Title`       | Levels 1–6           |
| Quote   | `> text`        | Supports GFM alerts  |
| Code    | Fenced block    | Tagged with language |

## Details

<details>
<summary>A collapsed section</summary>

Hidden content is written as Markdown, so it can hold **any** block.

- A list item
- Another list item

</details>

<details open>
<summary>A section that starts open</summary>

The `open` attribute expands the section by default.

</details>

## Custom HTML

<div class="callout">
	<strong>Custom HTML block</strong>
	<p>Raw HTML is preserved as a custom HTML block.</p>
</div>

## Separator

---

The end.
