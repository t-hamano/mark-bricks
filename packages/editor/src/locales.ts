// The WordPress locale slugs the editor has a catalog for. Hosts map their own
// language settings to these slugs, and list the same languages.
export const SUPPORTED_LOCALES = [
	'en',
	'ja',
	'zh_CN',
	'zh_TW',
	'fr_FR',
	'de_DE',
	'it_IT',
	'es_ES',
	'ko_KR',
	'ru_RU',
	'pt_BR',
	'tr_TR',
	'pl_PL',
	'cs_CZ',
] as const;

export type SupportedLocale = ( typeof SUPPORTED_LOCALES )[ number ];
