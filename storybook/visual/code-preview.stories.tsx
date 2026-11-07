/**
 * External dependencies
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { BlockEditor } from '@mark-bricks/editor';

/**
 * Previews of math blocks and `mermaid` code blocks for the visual regression
 * tests. Only built with `STORYBOOK_VISUAL_TESTS`, so they stay out of the
 * published Storybook.
 */
const meta: Meta< typeof BlockEditor > = {
	component: BlockEditor,
	title: 'CodePreview',
	argTypes: {
		content: { control: false },
		headerActions: { control: false },
	},
	args: {
		onChange: fn(),
	},
	render: ( args ) => (
		<div style={ { height: '100vh' } }>
			<BlockEditor { ...args } />
		</div>
	),
};

export default meta;

type Story = StoryObj< typeof BlockEditor >;

export const MathFormula: Story = {
	args: {
		content: [
			'```math',
			'\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}',
			'```',
		].join( '\n' ),
	},
};

export const MathParseError: Story = {
	args: {
		content: [ '```math', '\\frac{1}{', '```' ].join( '\n' ),
	},
};

export const MermaidDiagram: Story = {
	args: {
		content: [
			'```mermaid',
			'flowchart LR',
			'    A[Markdown] --> B{Parse}',
			'    B --> C[Blocks]',
			'    C --> A',
			'```',
		].join( '\n' ),
	},
};

export const MermaidParseError: Story = {
	args: {
		content: [ '```mermaid', 'flowchart LR', '    A -->', '```' ].join(
			'\n'
		),
	},
};
