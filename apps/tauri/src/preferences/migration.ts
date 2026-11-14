export type Scopes = Record< string, Record< string, unknown > >;

// v1 -> v2: `codeEditor.theme` dropped the Monaco theme id ('vs', 'vs-dark',
// 'hc-light', 'hc-black') in favor of a 'system' | 'light' | 'dark'
// preference; high contrast is now derived from the OS instead of chosen
// explicitly.
const CODE_EDITOR_THEME_V1_TO_V2: Record< string, string > = {
	vs: 'light',
	'vs-dark': 'dark',
	'hc-light': 'light',
	'hc-black': 'dark',
};

export function migrate( version: number | undefined, scopes: Scopes ): Scopes {
	if ( ( version ?? 0 ) < 2 ) {
		const codeEditor = scopes[ 'mark-bricks' ]?.codeEditor as
			{ theme?: string } | undefined;
		const mappedTheme =
			codeEditor?.theme && CODE_EDITOR_THEME_V1_TO_V2[ codeEditor.theme ];
		if ( mappedTheme ) {
			scopes = {
				...scopes,
				'mark-bricks': {
					...scopes[ 'mark-bricks' ],
					codeEditor: { ...codeEditor, theme: mappedTheme },
				},
			};
		}
	}
	if ( ( version ?? 0 ) < 3 ) {
		// v2 -> v3: the single `aiModel`, chosen for `aiProvider`, became
		// `aiModels`, a model for each provider.
		const { aiModel, ...rest } = scopes[ 'mark-bricks' ] ?? {};
		if ( typeof aiModel === 'string' ) {
			const provider =
				typeof rest.aiProvider === 'string'
					? rest.aiProvider
					: 'anthropic';
			scopes = {
				...scopes,
				'mark-bricks': {
					...rest,
					...( aiModel && { aiModels: { [ provider ]: aiModel } } ),
				},
			};
		}
	}
	return scopes;
}
