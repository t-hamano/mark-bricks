/**
 * External dependencies
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import { Editor } from '@mark-bricks/editor';
import * as fixtures from '@mark-bricks/fixtures';

/**
 * WordPress dependencies
 */
import { Button } from '@wordpress/ui';

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
		content: fixtures.smokeTest,
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
		headerActions: <Button size="small">Header Action Button</Button>,
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
