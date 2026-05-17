import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import gettextParser from 'gettext-parser';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );
const ROOT = path.resolve( __dirname, '..' );
const LANGUAGES_DIR = path.join( ROOT, 'languages' );
const SLUG = 'mark-bricks';
const DEFAULT_LOCALE = 'ja';

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

// Convert mark-bricks-<locale>.po into a Jed-style messages dict for the `mark-bricks` domain.
async function buildPluginMessages( locale ) {
	const poPath = path.join( LANGUAGES_DIR, `${ SLUG }-${ locale }.po` );
	const po = gettextParser.po.parse( await readFile( poPath ) );

	const messages = {
		'': {
			domain: SLUG,
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

async function main() {
	const locale = process.argv[ 2 ] || DEFAULT_LOCALE;

	const poPath = path.join( LANGUAGES_DIR, `${ SLUG }-${ locale }.po` );
	if ( ! ( await exists( poPath ) ) ) {
		throw new Error(
			`PO file not found: ${ path.relative(
				ROOT,
				poPath
			) }. Run \`npm run i18n:make-po -- ${ locale }\` first.`
		);
	}

	const plugin = await buildPluginMessages( locale );
	const gutenberg = await buildGutenbergMessages( locale );

	const payload = {
		'translation-revision-date':
			plugin.revisionDate ?? new Date().toISOString(),
		domain: SLUG,
		locale_data: {
			[ SLUG ]: plugin.messages,
			default: gutenberg.messages,
		},
	};

	const jsonPath = path.join( LANGUAGES_DIR, `${ SLUG }-${ locale }.json` );
	await writeFile( jsonPath, JSON.stringify( payload ) + '\n' );
	console.log(
		`✅ Wrote ${ path.relative( ROOT, jsonPath ) } (${
			plugin.translated
		} app strings, ${
			Object.keys( gutenberg.messages ).length - 1
		} gutenberg strings)`
	);
}

main().catch( ( err ) => {
	console.error( '❌', err );
	process.exit( 1 );
} );
