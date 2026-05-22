import gettextParser from 'gettext-parser';

// EOT (U+0004) separator between msgctxt and msgid in the Jed key format.
export const CONTEXT_SEPARATOR = String.fromCharCode( 0x04 );

// Sort a Jed messages dict by key for deterministic output, so re-fetching the
// same Gutenberg version produces byte-identical output (no spurious diffs in
// the committed cache). The '' header stays first; code-unit order avoids
// `localeCompare`'s engine dependence.
export function sortMessages( messages ) {
	const entries = Object.entries( messages ).sort( ( [ a ], [ b ] ) => {
		if ( a === '' || b === '' ) {
			return a === '' ? -1 : 1;
		}
		if ( a < b ) {
			return -1;
		}
		return a > b ? 1 : 0;
	} );
	return Object.fromEntries( entries );
}

/**
 * Parse a gettext PO buffer into a Jed-style messages dict for one domain.
 * Only translated entries are emitted; the '' header carries the domain,
 * plural-forms, and language metadata `@wordpress/i18n` expects.
 *
 * @param {Buffer|Uint8Array} poBuffer               Raw PO file contents.
 * @param {Object}            options
 * @param {string}            options.domain         Text domain for the '' header.
 * @param {string}            [options.fallbackLang] Language when the PO omits one.
 * @return {{ messages: Object, revisionDate: string|undefined, translated: number }} Jed messages dict, the PO revision date, and the translated-entry count.
 */
export function poToJedMessages( poBuffer, { domain, fallbackLang = '' } ) {
	const po = gettextParser.po.parse( poBuffer );

	const messages = {
		'': {
			domain,
			'plural-forms':
				po.headers[ 'Plural-Forms' ] ?? 'nplurals=2; plural=(n!=1);',
			lang: po.headers.Language ?? fallbackLang,
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
