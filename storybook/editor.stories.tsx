/**
 * External dependencies
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'storybook/preview-api';
import { fn } from 'storybook/test';

/**
 * WordPress dependencies
 */
import { Button } from '@wordpress/components';

/**
 * MarkBricks dependencies
 */
import { Editor } from '@mark-bricks/editor';

const defaultContent = `# Markdown editor

A basic document used as the default content for every story.

## Text formatting

This paragraph has *emphasis*, **strong**, \`inline code\` and a
[link](https://example.com).

## Lists

- First item
- Second item
  - Nested item
  - Another nested item
    - Deeply nested item
- Third item

1. Ordered item one
2. Ordered item two
   1. Nested ordered item
   2. Another nested ordered item
3. Ordered item three

## ToDo list

- [x] Write the default content
- [x] Add nested lists
- [ ] Review the rendered output
- [ ] Ship it

## Image

![A mountain landscape](https://picsum.photos/id/1018/800/400 "Lorem Picsum — free to use")

## Table

| Block   | Markdown syntax | Notes                 |
| ------- | --------------- | --------------------- |
| Heading | \`# Title\`       | Levels 1–6            |
| Quote   | \`> text\`        | Supports GFM alerts   |
| Code    | Fenced block    | Tagged with language  |

## Blockquote

> A plain quote to round out the basics.

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

\`\`\`js
function greet( name ) {
	const message = \`Hello, \${ name }!\`;
	console.log( message );
	return message;
}

[ 'MarkBricks', 'World' ].forEach( ( name ) => {
	greet( name );
} );
\`\`\`

\`\`\`python
def fibonacci(limit):
    a, b = 0, 1
    while a < limit:
        yield a
        a, b = b, a + b


for value in fibonacci(100):
    print(value, end=" ")
\`\`\`

\`\`\`css
.editor {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	padding: 1.5rem;
}

.editor__title {
	font-size: 2rem;
	font-weight: 700;
}
\`\`\`

## Custom HTML

<div class="callout" style="padding: 1rem; border: 1px solid #ccc; border-radius: 8px;">
	<strong>Custom HTML block</strong>
	<p>Raw HTML is preserved as a custom HTML block.</p>
</div>
`;

const meta: Meta< typeof Editor > = {
	component: Editor,
	title: 'Editor',
	tags: [ 'autodocs' ],
	argTypes: {
		editorMode: {
			control: 'radio',
			options: [ 'visual', 'text' ],
		},
		content: { control: false },
		headerActions: { control: false },
	},
	args: {
		editorMode: 'visual',
		content: defaultContent,
		onChange: fn(),
	},
	render: function Render( args ) {
		const [ content, setContent ] = useState( args.content ?? '' );
		return (
			<div style={ { height: '100vh' } }>
				<Editor
					{ ...args }
					content={ content }
					onChange={ ( next ) => {
						setContent( next );
						args.onChange( next );
					} }
				/>
			</div>
		);
	},
};

export default meta;

type Story = StoryObj< typeof Editor >;

export const Default: Story = {};

export const WithHeaderActions: Story = {
	args: {
		headerActions: (
			<Button variant="primary" size="small">
				Header Action Button
			</Button>
		),
	},
};

export const WithFixedToolbar: Story = {
	args: {
		settings: { fixedToolbar: true },
	},
};

export const WithFocusMode: Story = {
	args: {
		settings: { focusMode: true },
	},
};

export const WithCustomEditorStyles: Story = {
	args: {
		editorStyles: {
			contentWidth: 900,
			fontSize: 20,
			fontFamily:
				"'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', 'Marker Felt', cursive",
			css: `
				body {
					background: #f5f0e1;
				}
				.wp-block-heading {
					color: #b91c1c;
					border-bottom-color: currentColor;
					font-family: 'Courier New', monospace;
				}
			`,
		},
	},
};

export const WithCustomCodeEditor: Story = {
	args: {
		editorMode: 'text',
		settings: {
			codeEditor: {
				theme: 'vs-dark',
				fontSize: 20,
			},
		},
	},
};
