#!/usr/bin/env node

/**
 * Fetch a pinned Gutenberg version's translations and cache them next to the
 * editor's catalogs as `gutenberg-<version>-<locale>.json`. That committed file
 * is what `mb-i18n make-json` merges into the `default` domain at build time, so
 * the editor ships its block-editor dependency strings without make-json (or CI)
 * ever hitting the network. Re-run only when bumping the bundled Gutenberg.
 */

import { readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import { poToJedMessages, sortMessages } from '@mark-bricks/i18n-tools/jed';

const LANGUAGES_DIR = fileURLToPath(
	new URL( '../languages', import.meta.url )
);

function parseArgs( argv ) {
	const flags = {};
	const positionals = [];
	for ( const arg of argv ) {
		if ( arg.startsWith( '--' ) ) {
			const [ key, value ] = arg.slice( 2 ).split( '=' );
			flags[ key ] = value === undefined ? true : value;
		} else {
			positionals.push( arg );
		}
	}
	return { flags, positionals };
}

// Latest released Gutenberg version that has a translation set for `locale`.
async function resolveLatestVersion( locale ) {
	const url =
		'https://api.wordpress.org/translations/plugins/1.0/?slug=gutenberg';
	const res = await fetch( url );
	if ( ! res.ok ) {
		throw new Error( `Version lookup failed: ${ res.status } ${ url }` );
	}
	const { translations = [] } = await res.json();
	const match = translations.find( ( t ) => t.language === locale );
	if ( ! match ) {
		throw new Error(
			`No Gutenberg translation set for locale "${ locale }".`
		);
	}
	return match.version;
}

async function main() {
	const { flags, positionals } = parseArgs( process.argv.slice( 2 ) );
	const locale = positionals[ 0 ] ?? 'ja';
	const version =
		typeof flags.version === 'string'
			? flags.version
			: await resolveLatestVersion( locale );

	const zipUrl = `https://downloads.wordpress.org/translation/plugin/gutenberg/${ version }/${ locale }.zip`;
	console.log(
		`⏳ Fetching Gutenberg ${ version } (${ locale }) from ${ zipUrl }`
	);
	const res = await fetch( zipUrl );
	if ( ! res.ok ) {
		throw new Error( `Fetch failed: ${ res.status } ${ zipUrl }` );
	}

	const zip = unzipSync( new Uint8Array( await res.arrayBuffer() ) );
	const poName =
		Object.keys( zip ).find( ( n ) => n === `gutenberg-${ locale }.po` ) ??
		Object.keys( zip ).find( ( n ) => n.endsWith( '.po' ) );
	if ( ! poName ) {
		throw new Error(
			`No .po in ${ zipUrl } (entries: ${ Object.keys( zip ).join(
				', '
			) })`
		);
	}

	const { messages, revisionDate } = poToJedMessages(
		Buffer.from( zip[ poName ] ),
		{ domain: 'default', fallbackLang: locale }
	);
	for ( const name of Object.keys( zip ) ) {
		if ( name === poName || ! name.endsWith( '.json' ) ) {
			continue;
		}
		const shard = JSON.parse(
			Buffer.from( zip[ name ] ).toString( 'utf8' )
		);
		for ( const dict of Object.values( shard.locale_data ?? {} ) ) {
			for ( const [ key, value ] of Object.entries( dict ) ) {
				if ( key !== '' ) {
					messages[ key ] = value;
				}
			}
		}
	}
	const translated = Object.keys( messages ).length - 1; // minus '' header

	const payload = {
		'translation-revision-date': revisionDate ?? new Date().toISOString(),
		'gutenberg-version': version,
		domain: 'default',
		locale_data: { default: sortMessages( messages ) },
	};

	// Keep a single cache file per locale: drop older pinned versions first.
	for ( const file of await readdir( LANGUAGES_DIR ) ) {
		if (
			file.startsWith( 'gutenberg' ) &&
			file.endsWith( `-${ locale }.json` )
		) {
			await rm( path.join( LANGUAGES_DIR, file ) );
		}
	}

	const outName = `gutenberg-${ version }-${ locale }.json`;
	await writeFile(
		path.join( LANGUAGES_DIR, outName ),
		JSON.stringify( payload ) + '\n'
	);
	console.log(
		`✅ Wrote languages/${ outName } (${ translated } gutenberg strings)`
	);
}

main().catch( ( err ) => {
	console.error( '❌', err );
	process.exit( 1 );
} );
