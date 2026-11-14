/**
 * External dependencies
 */
import {
	FONT_FAMILIES,
	FONT_FAMILY_STACKS,
	isFontFamily,
	type FontFamily,
} from '@mark-bricks/editor/font-families';

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

// v2 -> v3: `editorStyles.fontFamily` held the font stack itself, which no
// longer matched any choice once the editor changed a stack. It now holds the
// font family. A stack that matches none falls back to the default font.
function toFontFamily( value: unknown ): FontFamily {
	if ( isFontFamily( value ) ) {
		return value;
	}
	return (
		FONT_FAMILIES.find(
			( family ) => FONT_FAMILY_STACKS[ family ] === value
		) ?? 'system'
	);
}

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
		const editorStyles = scopes[ 'mark-bricks' ]?.editorStyles as
			{ fontFamily?: unknown } | undefined;
		if ( editorStyles && 'fontFamily' in editorStyles ) {
			scopes = {
				...scopes,
				'mark-bricks': {
					...scopes[ 'mark-bricks' ],
					editorStyles: {
						...editorStyles,
						fontFamily: toFontFamily( editorStyles.fontFamily ),
					},
				},
			};
		}
	}
	return scopes;
}
