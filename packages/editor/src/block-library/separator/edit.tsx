/**
 * WordPress dependencies
 */
import { useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { useFrontMatter } from '../../components/front-matter-editor/context';
import { isMarpFrontMatter } from '../../converter/front-matter';

export default function Edit() {
	// In a Marp slide deck, a separator starts a new slide, so it is labeled
	// as such instead of drawn as a plain rule.
	const { frontMatter } = useFrontMatter();
	const isMarp = isMarpFrontMatter( frontMatter );
	const blockProps = useBlockProps( {
		className: isMarp ? 'is-slide-separator' : undefined,
	} );
	if ( isMarp ) {
		return (
			<div { ...blockProps } role="separator">
				<div className="wp-block-separator__line" aria-hidden="true" />
				{ __( 'Slide Separator', 'mark-bricks' ) }
				<div className="wp-block-separator__line" aria-hidden="true" />
			</div>
		);
	}
	return <hr { ...blockProps } />;
}
