import { addons, types } from 'storybook/manager-api';

// The toolbar items that only stories follow: docs stories use isolated
// iframes that do not receive the globals. `toolbar` holds the pickers of the
// preview's `globalTypes`, the locale one among them.
const STORY_ONLY_TOOL_IDS = [ 'storybook/themes/theme-switcher', 'toolbar' ];

const matchStory = ( {
	viewMode,
	tabId,
}: {
	viewMode?: string;
	tabId?: string;
} ) => viewMode === 'story' && ! tabId;

addons.register( 'mark-bricks/story-only-tools', () => {
	const tools = addons.getElements( types.TOOL );
	for ( const id of STORY_ONLY_TOOL_IDS ) {
		const tool = tools[ id ];
		if ( tool ) {
			addons.add( id, { ...tool, match: matchStory } );
		}
	}

	// Storybook adds its own `toolbar` after the addons, so this changes it
	// as it is added.
	const add = addons.add.bind( addons );
	addons.add = ( id, addon ) =>
		add(
			id,
			STORY_ONLY_TOOL_IDS.includes( id ) && addon.type === types.TOOL
				? { ...addon, match: matchStory }
				: addon
		);
} );
