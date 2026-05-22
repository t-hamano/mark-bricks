import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import gettextParser from 'gettext-parser';

// EOT (U+0004) separator between msgctxt and msgid in the Jed key format.
const CONTEXT_SEPARATOR = String.fromCharCode( 0x04 );

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
	const po = gettextParser.po.parse( await readFile( poPath ) );

	const messages = {
		'': {
			domain: slug,
			'plural-forms':
				po.headers[ 'Plural-Forms' ] ?? 'nplurals=2; plural=(n!=1);',
			lang: po.headers.Language ?? locale,
		},
	};

	let translated = 0;
	for ( const ctxKey of Object.keys( po.translations ) ) {
		for ( const idKey of Object.keys( po.translations[ ctxKey ] ) ) {
			if ( idKey === '' ) {
				continue;
			}
			const entry = po.translations[ ctxKey ][ idKey ];
			if ( ! entry.msgstr.some( ( s ) => s ) ) {
				continue;
			}
			const key = ctxKey
				? `${ ctxKey }${ CONTEXT_SEPARATOR }${ idKey }`
				: idKey;
			messages[ key ] = entry.msgstr;
			translated++;
		}
	}

	return {
		messages,
		revisionDate: po.headers[ 'PO-Revision-Date' ],
		translated,
	};
}

// Fetch Gutenberg translations from translate.wordpress.org as a Jed-style messages dict for the `default` domain.
async function buildGutenbergMessages( locale ) {
	const url = `https://translate.wordpress.org/projects/wp-plugins/gutenberg/stable/${ locale }/default/export-translations/?format=jed1x`;

	console.log( `⏳ Fetching ${ locale }/default from ${ url }` );

	const res = await fetch( url );
	if ( ! res.ok ) {
		throw new Error( `Fetch failed: ${ res.status } ${ url }` );
	}

	const jed = await res.json();
	const dict = jed.locale_data?.messages;
	if ( ! dict ) {
		throw new Error( `No locale_data.messages in response from ${ url }` );
	}
	dict[ '' ] = { ...dict[ '' ], domain: 'default' };

	return {
		messages: dict,
		revisionDate: jed[ 'translation-revision-date' ],
	};
}

/**
 * Compile the per-locale .po into a Jed-style JSON catalog consumable by
 * `@wordpress/i18n`. Optionally bundles Gutenberg's `default` domain so a
 * standalone host (the editor package) ships its dependency translations.
 *
 * @param {Object}  options
 * @param {string}  options.root             Package root that owns `languages/`.
 * @param {string}  options.slug             Text domain / file slug.
 * @param {string}  options.locale           Locale code (e.g. `ja`).
 * @param {boolean} options.includeGutenberg Bundle the `default` (Gutenberg) domain.
 */
export async function makeJson( {
	root,
	slug,
	locale,
	includeGutenberg = false,
} ) {
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

	let gutenberg;
	if ( includeGutenberg ) {
		gutenberg = await buildGutenbergMessages( locale );
		localeData.default = gutenberg.messages;
	}

	const payload = {
		'translation-revision-date':
			plugin.revisionDate ?? new Date().toISOString(),
		domain: slug,
		locale_data: localeData,
	};

	const jsonPath = path.join( languagesDir, `${ slug }-${ locale }.json` );
	await writeFile( jsonPath, JSON.stringify( payload ) + '\n' );
	console.log(
		`✅ Wrote ${ path.relative( root, jsonPath ) } (${
			plugin.translated
		} app strings${
			gutenberg
				? `, ${
						Object.keys( gutenberg.messages ).length - 1
				  } gutenberg strings`
				: ''
		})`
	);
}
