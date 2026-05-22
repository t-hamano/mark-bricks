import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { poToJedMessages } from './jed.mjs';

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
 * Compile every committed `<slug>-<locale>.po` in the package into its Jed-style
 * JSON catalog for `@wordpress/i18n`, merging any matching committed Gutenberg
 * dictionary. Locales are discovered from the `.po` files on disk — there is no
 * locale argument — so adding a `.po` is all it takes for the next build to pick
 * it up. The output is gitignored and regenerated on install / by hand.
 *
 * @param {Object} options
 * @param {string} options.root Package root that owns `languages/`.
 * @param {string} options.slug Text domain / file slug.
 */
export async function makeJson( { root, slug } ) {
	const languagesDir = path.join( root, 'languages' );
	const locales = ( await readdir( languagesDir ) )
		.filter( ( f ) => f.startsWith( `${ slug }-` ) && f.endsWith( '.po' ) )
		.map( ( f ) => f.slice( `${ slug }-`.length, -'.po'.length ) )
		.sort();

	if ( locales.length === 0 ) {
		throw new Error(
			`No ${ slug }-<locale>.po found in ${ path.relative(
				root,
				languagesDir
			) }. Run \`npm run i18n:make-po\` first.`
		);
	}

	for ( const locale of locales ) {
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

		const jsonPath = path.join(
			languagesDir,
			`${ slug }-${ locale }.json`
		);
		// Minified: this dictionary is gitignored and the bundler re-minifies it
		// on import, so its on-disk format is read by neither humans nor git.
		await writeFile( jsonPath, JSON.stringify( payload ) + '\n' );
		console.log(
			`✅ Wrote ${ path.relative( root, jsonPath ) } (${
				plugin.translated
			} app strings${
				gutenbergStrings
					? `, ${ gutenbergStrings } gutenberg strings`
					: ''
			})`
		);
	}
}
