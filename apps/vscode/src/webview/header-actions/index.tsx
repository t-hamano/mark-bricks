/**
 * External dependencies
 */
import { useFrontMatter } from '@mark-bricks/editor/front-matter';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { moreVertical } from '@wordpress/icons';
import { IconButton, Menu } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import './style.scss';

export default function HeaderActions() {
	const { frontMatter, setFrontMatter } = useFrontMatter();
	const hasFrontMatter = frontMatter !== null;
	const isFrontMatterEmpty = frontMatter?.trim() === '';

	return (
		<Menu.Root>
			<Menu.Trigger
				render={
					<IconButton
						icon={ moreVertical }
						label={ __( 'Options', 'mark-bricks' ) }
						variant="minimal"
						tone="neutral"
						size="compact"
					/>
				}
			/>
			<Menu.Popup
				className="header-actions__menu"
				positioner={ <Menu.Positioner align="end" /> }
			>
				<Menu.Item
					onClick={ () =>
						setFrontMatter( hasFrontMatter ? null : '' )
					}
				>
					<Menu.ItemLabel>
						{ ! hasFrontMatter &&
							__( 'Add YAML front matter', 'mark-bricks' ) }
						{ isFrontMatterEmpty &&
							__( 'Hide YAML front matter', 'mark-bricks' ) }
						{ hasFrontMatter &&
							! isFrontMatterEmpty &&
							__( 'Remove YAML front matter', 'mark-bricks' ) }
					</Menu.ItemLabel>
				</Menu.Item>
			</Menu.Popup>
		</Menu.Root>
	);
}
