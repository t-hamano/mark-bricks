import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import gettextParser from 'gettext-parser';

async function exists( p ) {
	try {
		await access( p );
		return true;
	} catch {
		return false;
	}
}

function setHeaders( po, locale, existingHeaders ) {
	po.headers = {
		...po.headers,
		Language: locale,
		'PO-Revision-Date': new Date().toISOString(),
		'Last-Translator':
			existingHeaders?.[ 'Last-Translator' ] ??
			po.headers[ 'Last-Translator' ] ??
			'',
		'Language-Team':
			existingHeaders?.[ 'Language-Team' ] ??
			po.headers[ 'Language-Team' ] ??
			'',
	};
}

// Take pot as the source of truth for which entries exist, then port over
// any non-empty msgstr from the existing .po (matched by msgctxt + msgid).
function mergeTranslations( pot, existing ) {
	let kept = 0;
	let added = 0;

	for ( const ctxKey of Object.keys( pot.translations ) ) {
		for ( const idKey of Object.keys( pot.translations[ ctxKey ] ) ) {
			if ( idKey === '' ) {
				continue;
			}
			const prev = existing.translations[ ctxKey ]?.[ idKey ];
			if ( prev && prev.msgstr.some( ( s ) => s ) ) {
				pot.translations[ ctxKey ][ idKey ].msgstr = prev.msgstr;
				if ( prev.comments?.translator ) {
					pot.translations[ ctxKey ][ idKey ].comments = {
						...pot.translations[ ctxKey ][ idKey ].comments,
						translator: prev.comments.translator,
					};
				}
				kept++;
			} else {
				added++;
			}
		}
	}

	let dropped = 0;
	for ( const ctxKey of Object.keys( existing.translations ) ) {
		for ( const idKey of Object.keys( existing.translations[ ctxKey ] ) ) {
			if ( idKey === '' ) {
				continue;
			}
			if ( ! pot.translations[ ctxKey ]?.[ idKey ] ) {
				dropped++;
			}
		}
	}

	return { kept, added, dropped, total: countEntries( pot ) };
}

function countEntries( po ) {
	let n = 0;
	for ( const ctxKey of Object.keys( po.translations ) ) {
		for ( const idKey of Object.keys( po.translations[ ctxKey ] ) ) {
			if ( idKey !== '' ) {
				n++;
			}
		}
	}
	return n;
}

/**
 * Merge the POT template into a per-locale .po file, preserving existing
 * translations. Creates the .po file when missing.
 *
 * @param {Object} options
 * @param {string} options.root   Package root that owns the `languages/` dir.
 * @param {string} options.slug   Text domain / file slug (e.g. `mark-bricks`).
 * @param {string} options.locale Locale code (e.g. `ja`).
 */
export async function makePo( { root, slug, locale } ) {
	const languagesDir = path.join( root, 'languages' );
	const potPath = path.join( languagesDir, `${ slug }.pot` );
	const poPath = path.join( languagesDir, `${ slug }-${ locale }.po` );

	if ( ! ( await exists( potPath ) ) ) {
		throw new Error(
			`POT not found: ${ potPath }. Run \`npm run i18n:make-pot\` first.`
		);
	}

	const pot = gettextParser.po.parse( await readFile( potPath ) );

	let mode;
	let stats;
	if ( await exists( poPath ) ) {
		const existing = gettextParser.po.parse( await readFile( poPath ) );
		stats = mergeTranslations( pot, existing );
		setHeaders( pot, locale, existing.headers );
		mode = 'merged';
	} else {
		setHeaders( pot, locale, undefined );
		stats = {
			kept: 0,
			added: countEntries( pot ),
			dropped: 0,
			total: countEntries( pot ),
		};
		mode = 'created';
	}

	const out = gettextParser.po.compile( pot, {
		sort: true,
	} );
	await writeFile( poPath, out );

	console.log(
		`✅ ${ mode } ${ path.relative( root, poPath ) }`,
		`(total ${ stats.total }, kept ${ stats.kept }, new ${ stats.added }, dropped ${ stats.dropped })`
	);
}
