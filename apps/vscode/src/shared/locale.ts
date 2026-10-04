// VS Code display language IDs mapped to the WordPress locale slugs the editor
// uses as locale codes.
// See https://code.visualstudio.com/docs/configure/locales#_available-locales
// Hungarian (`hu`) is left out: WordPress.org publishes no Gutenberg language
// pack for `hu_HU`, so most of the editor UI would stay in English.
const WP_LOCALES: Partial< Record< string, string > > = {
	en: 'en',
	'zh-cn': 'zh_CN',
	'zh-tw': 'zh_TW',
	fr: 'fr_FR',
	de: 'de_DE',
	it: 'it_IT',
	es: 'es_ES',
	ja: 'ja',
	ko: 'ko_KR',
	ru: 'ru_RU',
	'pt-br': 'pt_BR',
	tr: 'tr_TR',
	pl: 'pl_PL',
	cs: 'cs_CZ',
};

/**
 * Converts a VS Code display language ID to the WordPress locale slug that
 * the editor's `setupEditor` and the slide preview's `applyLocale` expect.
 *
 * @param lang VS Code display language ID (`vscode.env.language`).
 * @return WordPress locale slug.
 */
export function resolveVsCodeLocale( lang: string ): string {
	return WP_LOCALES[ lang ] ?? lang;
}
