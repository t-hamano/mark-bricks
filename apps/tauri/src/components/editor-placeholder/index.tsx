/**
 * WordPress dependencies
 */
import { Button } from '@wordpress/components';
import { upload } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';
import { Icon, Stack, Text } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { newFile, openFile } from '../../actions';
import DropZone from '../drop-zone';
import './style.scss';

export default function EditorPlaceholder() {
	return (
		<div className="editor-placeholder">
			<Stack direction="column" align="center" gap="md">
				<Text variant="heading-md">
					{ __( 'No file open', 'mark-bricks' ) }
				</Text>
				<Text variant="body-sm" className="editor-placeholder__hint">
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
			<DropZone>
				<Stack direction="column" align="center" gap="sm">
					<Icon icon={ upload } />
					<Text>
						{ __(
							'Drop a Markdown file to open it',
							'mark-bricks'
						) }
					</Text>
				</Stack>
			</DropZone>
		</div>
	);
}
