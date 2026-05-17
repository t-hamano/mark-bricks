/**
 * WordPress dependencies
 */
import { Modal } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as interfaceStore } from '@wordpress/interface';
import { Badge, Link, Stack, Text } from '@wordpress/ui';

export const ABOUT_MODAL_NAME = 'mark-bricks/about';

const REPORT_ISSUE_URL = 'https://example.com/issues';

type Props = {
	name: string;
	version: string;
};

export default function AboutModal( { name, version }: Props ) {
	const { closeModal } = useDispatch( interfaceStore );

	const isOpened = useSelect(
		( select ) =>
			select( interfaceStore ).isModalActive( ABOUT_MODAL_NAME ),
		[]
	);

	if ( ! isOpened ) {
		return null;
	}

	return (
		<Modal
			title={ __( 'About', 'mark-bricks' ) }
			onRequestClose={ () => closeModal() }
			className="about-modal"
		>
			<Stack direction="column" align="center" gap="xl">
				<Stack direction="row" align="center" gap="md">
					<Text variant="heading-xl">{ name }</Text>
					{ version && (
						<Badge intent="informational">{ `v${ version }` }</Badge>
					) }
				</Stack>
				<Link href={ REPORT_ISSUE_URL } openInNewTab>
					{ __( 'Report an issue', 'mark-bricks' ) }
				</Link>
			</Stack>
		</Modal>
	);
}
