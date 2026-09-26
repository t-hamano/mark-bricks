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
import type { Settings, WritableSettingKey } from '../../shared/settings';
import './style.scss';

type Props = {
	settings: Settings;
	onSettingChange: ( key: WritableSettingKey, value: boolean ) => void;
};

export default function HeaderActions( { settings, onSettingChange }: Props ) {
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
				<Menu.Group>
					<Menu.GroupLabel>
						{ __( 'View', 'mark-bricks' ) }
					</Menu.GroupLabel>
					<Menu.CheckboxItem
						checked={ settings.fixedToolbar }
						onCheckedChange={ ( checked ) =>
							onSettingChange( 'fixedToolbar', checked )
						}
					>
						<Menu.ItemLabel>
							{ __( 'Top toolbar', 'mark-bricks' ) }
						</Menu.ItemLabel>
						<Menu.ItemDescription>
							{ __(
								'Access all block and document tools in a single place',
								'mark-bricks'
							) }
						</Menu.ItemDescription>
					</Menu.CheckboxItem>
					<Menu.CheckboxItem
						checked={ settings.focusMode }
						onCheckedChange={ ( checked ) =>
							onSettingChange( 'focusMode', checked )
						}
					>
						<Menu.ItemLabel>
							{ __( 'Spotlight mode', 'mark-bricks' ) }
						</Menu.ItemLabel>
						<Menu.ItemDescription>
							{ __(
								'Focus on one block at a time',
								'mark-bricks'
							) }
						</Menu.ItemDescription>
					</Menu.CheckboxItem>
				</Menu.Group>
				<Menu.Separator />
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
