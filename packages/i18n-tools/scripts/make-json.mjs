import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { poToJedMessages } from './jed.mjs';

async function exists( p ) {
	try {
		await access( p );
		return true;
	} catch {
		return false;
	}
}

// Convert <slug>-<locale>.po into a Jed-style messages dict for the `<slug>` domain.
async function buildPluginMessages( languagesDir, slug, locale ) {
	const poPath = path.join( languagesDir, `${ slug }-${ locale }.po` );
	return poToJedMessages( await readFile( poPath ), {
		domain: slug,
		fallbackLang: locale,
	} );
}

/**
 * Merge any committed Gutenberg dictionaries sitting next to the .po into
 * `localeData`. A standalone host that ships the WordPress block editor needs
 * these so its dependency strings (the `default` domain) are translated too.
 *
 * The files are produced offline by the editor's `i18n:fetch-gutenberg` script
 * and named `gutenberg-<version>-<locale>.json`, so make-json never touches the
 * network. Anything starting with `gutenberg` whose locale matches is merged.
 *
 * @param {string} languagesDir Directory holding the catalogs.
 * @param {string} locale       Locale code (e.g. `ja`).
 * @param {Object} localeData   Domain→messages map to merge into (mutated).
 * @return {Promise<number>} Count of merged message keys (excluding '' headers).
 */
async function mergeLocalGutenberg( languagesDir, locale, localeData ) {
	const files = ( await readdir( languagesDir ) )
		.filter(
			( f ) =>
				f.startsWith( 'gutenberg' ) && f.endsWith( `-${ locale }.json` )
		)
		.sort();

	let merged = 0;
	for ( const file of files ) {
		const data = JSON.parse(
			await readFile( path.join( languagesDir, file ), 'utf8' )
		);
		for ( const [ domain, dict ] of Object.entries(
			data.locale_data ?? {}
		) ) {
			localeData[ domain ] = { ...localeData[ domain ], ...dict };
			merged += Object.keys( dict ).filter( ( k ) => k !== '' ).length;
		}
	}
	return merged;
}

/**
 * Compile the per-locale .po into a Jed-style JSON catalog consumable by
 * `@wordpress/i18n`, merging any committed Gutenberg dictionaries found next to
 * it. The output is gitignored and regenerated at build time.
 *
 * @param {Object} options
 * @param {string} options.root   Package root that owns `languages/`.
 * @param {string} options.slug   Text domain / file slug.
 * @param {string} options.locale Locale code (e.g. `ja`).
 */
export async function makeJson( { root, slug, locale } ) {
	const languagesDir = path.join( root, 'languages' );
	const poPath = path.join( languagesDir, `${ slug }-${ locale }.po` );
	if ( ! ( await exists( poPath ) ) ) {
		throw new Error(
			`PO file not found: ${ path.relative(
				root,
				poPath
			) }. Run \`npm run i18n:make-po -- ${ locale }\` first.`
		);
	}

	const plugin = await buildPluginMessages( languagesDir, slug, locale );
	const localeData = { [ slug ]: plugin.messages };
	const gutenbergStrings = await mergeLocalGutenberg(
		languagesDir,
		locale,
		localeData
	);

	const payload = {
		'translation-revision-date':
			plugin.revisionDate ?? new Date().toISOString(),
		domain: slug,
		locale_data: localeData,
	};

	const jsonPath = path.join( languagesDir, `${ slug }-${ locale }.json` );
	// Minified: this dictionary is gitignored and the bundler re-minifies it on
	// import, so its on-disk format is read by neither humans nor git.
	await writeFile( jsonPath, JSON.stringify( payload ) + '\n' );
	console.log(
		`✅ Wrote ${ path.relative( root, jsonPath ) } (${
			plugin.translated
		} app strings${
			gutenbergStrings ? `, ${ gutenbergStrings } gutenberg strings` : ''
		})`
	);
}
