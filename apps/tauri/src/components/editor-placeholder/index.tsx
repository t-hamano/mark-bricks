/**
 * WordPress dependencies
 */
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Stack, Text } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { newFile, openFile } from '../../actions';
import './style.scss';

export default function EditorPlaceholder() {
	return (
		<Stack
			className="editor-placeholder"
			direction="column"
			align="center"
			justify="center"
			gap="md"
		>
			<Text variant="heading-md">
				{ __( 'No file open', 'mark-bricks' ) }
			</Text>
			<Text
				variant="body-sm"
				style={ {
					color: 'var(--wpds-color-fg-content-neutral-weak)',
				} }
			>
				{ __(
					'Create a new Markdown file or open an existing one to start editing.',
					'mark-bricks'
				) }
			</Text>
			<Stack direction="row" gap="sm">
				<Button
					variant="primary"
					onClick={ () => newFile() }
					size="compact"
				>
					{ __( 'New file', 'mark-bricks' ) }
				</Button>
				<Button
					variant="secondary"
					onClick={ () => {
						openFile();
					} }
					size="compact"
				>
					{ __( 'Open file…', 'mark-bricks' ) }
				</Button>
			</Stack>
		</Stack>
	);
}
