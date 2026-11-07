/**
 * External dependencies
 */
import { setupEditor } from '@mark-bricks/editor';

/**
 * Internal dependencies
 */
import { getInitialLanguage } from './preferences';
import { applyDesktopLocale } from './i18n';

async function main() {
	const initialLanguage = await getInitialLanguage();
	const locale = await setupEditor( initialLanguage );

	applyDesktopLocale( locale );

	const [ React, { default: ReactDOM }, { App }, { setupPreferences } ] =
		await Promise.all( [
			import( 'react' ),
			import( 'react-dom/client' ),
			import( './components/app' ),
			import( './preferences' ),
			import( './index.scss' ),
		] );

	await Promise.allSettled( [ setupPreferences() ] );

	ReactDOM.createRoot(
		document.getElementById( 'root' ) as HTMLElement
	).render(
		<React.StrictMode>
			<App />
		</React.StrictMode>
	);
}

void main();
