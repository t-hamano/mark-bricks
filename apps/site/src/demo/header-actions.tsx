/**
 * External dependencies
 */
import { useFrontMatter } from '@mark-bricks/editor/front-matter';

/**
 * WordPress dependencies
 */
import { moreVertical } from '@wordpress/icons';
import { IconButton, Menu } from '@wordpress/ui';

type Props = {
	topToolbar: boolean;
	onTopToolbarChange: ( checked: boolean ) => void;
	spotlightMode: boolean;
	onSpotlightModeChange: ( checked: boolean ) => void;
};

// A subset of the apps' options menu, to show off the view and front matter
// tools without the host-specific items.
export default function HeaderActions( {
	topToolbar,
	onTopToolbarChange,
	spotlightMode,
	onSpotlightModeChange,
}: Props ) {
	const { frontMatter, setFrontMatter } = useFrontMatter();
	const hasFrontMatter = frontMatter !== null;
	const isFrontMatterEmpty = frontMatter?.trim() === '';

	return (
		<Menu.Root>
			<Menu.Trigger
				render={
					<IconButton
						icon={ moreVertical }
						label="Options"
						variant="minimal"
						tone="neutral"
						size="compact"
					/>
				}
			/>
			<Menu.Popup positioner={ <Menu.Positioner align="end" /> }>
				<Menu.Group>
					<Menu.GroupLabel>View</Menu.GroupLabel>
					<Menu.CheckboxItem
						checked={ topToolbar }
						onCheckedChange={ onTopToolbarChange }
					>
						<Menu.ItemLabel>Top toolbar</Menu.ItemLabel>
						<Menu.ItemDescription>
							Access all block and document tools in a single
							place
						</Menu.ItemDescription>
					</Menu.CheckboxItem>
					<Menu.CheckboxItem
						checked={ spotlightMode }
						onCheckedChange={ onSpotlightModeChange }
					>
						<Menu.ItemLabel>Spotlight mode</Menu.ItemLabel>
						<Menu.ItemDescription>
							Focus on one block at a time
						</Menu.ItemDescription>
					</Menu.CheckboxItem>
				</Menu.Group>
				<Menu.Separator />
				<Menu.Group>
					<Menu.GroupLabel>Tools</Menu.GroupLabel>
					<Menu.Item
						onClick={ () =>
							setFrontMatter( hasFrontMatter ? null : '' )
						}
					>
						<Menu.ItemLabel>
							{ ! hasFrontMatter && 'Add YAML front matter' }
							{ isFrontMatterEmpty && 'Hide YAML front matter' }
							{ hasFrontMatter &&
								! isFrontMatterEmpty &&
								'Remove YAML front matter' }
						</Menu.ItemLabel>
					</Menu.Item>
				</Menu.Group>
			</Menu.Popup>
		</Menu.Root>
	);
}
