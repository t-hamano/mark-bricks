/**
 * External dependencies
 */
import { applyLocale } from '@mark-bricks/editor';

/**
 * Internal dependencies
 */
import { getInitialLanguage } from './preferences';

async function main() {
	// Apply locale BEFORE importing any module that calls `__()` at
	// module load time.
	const initialLanguage = await getInitialLanguage();
	applyLocale( initialLanguage );

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
