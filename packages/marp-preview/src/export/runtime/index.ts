/**
 * The script that exported pages run. `pnpm build` bundles it, with its
 * stylesheet and the strings of every locale, into `dist/runtime.ts`,
 * which `renderHtmlDocument` inlines into each page.
 */

/**
 * Internal dependencies
 */
import { setupExportedDeck } from './deck';
import { applyPreferredLocale } from './i18n';
import './style.css';

const locale = applyPreferredLocale( navigator.languages ?? [] );
setupExportedDeck( locale?.replace( '_', '-' ) );
