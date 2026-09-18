/**
 * External dependencies
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import { CodeEditor } from '@mark-bricks/editor';
import * as fixtures from '@mark-bricks/fixtures';

/**
 * WordPress dependencies
 */
import { Button } from '@wordpress/ui';

const meta: Meta< typeof CodeEditor > = {
	component: CodeEditor,
	title: 'CodeEditor',
	tags: [ 'autodocs' ],
	argTypes: {
		content: { control: false },
		headerActions: { control: false },
	},
	args: {
		content: fixtures.smokeTest,
		onChange: fn(),
	},
	render: function Render( args ) {
		const [ content, setContent ] = useState( args.content ?? '' );
		return (
			<div style={ { height: '100vh' } }>
				<CodeEditor
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

type Story = StoryObj< typeof CodeEditor >;

export const Default: Story = {};

export const WithHeaderActions: Story = {
	args: {
		headerActions: <Button size="compact">Header Action Button</Button>,
	},
};

export const WithCustomTheme: Story = {
	args: {
		settings: {
			codeEditor: {
				theme: 'vs-dark',
				fontSize: 20,
			},
		},
	},
};
