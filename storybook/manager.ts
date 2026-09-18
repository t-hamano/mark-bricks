import { addons, types } from 'storybook/manager-api';

const THEME_SWITCHER_ID = 'storybook/themes/theme-switcher';

addons.register( 'mark-bricks/themes-visibility', () => {
	const themeSwitcher = addons.getElements( types.TOOL )[ THEME_SWITCHER_ID ];

	if ( ! themeSwitcher ) {
		return;
	}

	// Docs stories use isolated iframes that do not receive theme globals.
	addons.add( THEME_SWITCHER_ID, {
		...themeSwitcher,
		match: ( { viewMode, tabId } ) => viewMode === 'story' && ! tabId,
	} );
} );
