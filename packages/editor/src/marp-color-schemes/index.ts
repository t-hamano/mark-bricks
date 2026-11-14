/**
 * Internal dependencies
 */
import {
	getFrontMatterBlockValue,
	setFrontMatterBlockValue,
} from '../converter/front-matter';

export type MarpColorSchemeColors = {
	background: string;
	foreground: string;
	// Links, highlighted text and bold text in headings.
	accent: string;
	// Secondary text such as the header, footer and page number.
	muted: string;
};

export type MarpColorScheme = {
	id: string;
	label: string;
	// Picks the light or dark variant of the colors the scheme leaves to
	// the theme, such as syntax highlighting.
	colorScheme: 'light' | 'dark';
	colors: MarpColorSchemeColors;
};

export const MARP_COLOR_SCHEMES: MarpColorScheme[] = [
	{
		id: 'slate',
		label: 'Slate',
		colorScheme: 'light',
		colors: {
			background: '#f8fafc',
			foreground: '#1e293b',
			accent: '#0e7490',
			muted: '#64748b',
		},
	},
	{
		id: 'ink',
		label: 'Ink',
		colorScheme: 'dark',
		colors: {
			background: '#0f172a',
			foreground: '#e2e8f0',
			accent: '#38bdf8',
			muted: '#94a3b8',
		},
	},
	{
		id: 'paper',
		label: 'Paper',
		colorScheme: 'light',
		colors: {
			background: '#faf7f0',
			foreground: '#3f3a33',
			accent: '#b45309',
			muted: '#78716c',
		},
	},
	{
		id: 'forest',
		label: 'Forest',
		colorScheme: 'light',
		colors: {
			background: '#f0f7f4',
			foreground: '#1f3a2e',
			accent: '#15803d',
			muted: '#5b7065',
		},
	},
	{
		id: 'coral',
		label: 'Coral',
		colorScheme: 'light',
		colors: {
			background: '#fff7f5',
			foreground: '#3b1f1a',
			accent: '#e11d48',
			muted: '#8a6a64',
		},
	},
	{
		id: 'mono',
		label: 'Mono',
		colorScheme: 'light',
		colors: {
			background: '#ffffff',
			foreground: '#111111',
			accent: '#111111',
			muted: '#6b6b6b',
		},
	},
];

type ColorRole = keyof MarpColorSchemeColors;

// The CSS variables each of Marp's built-in themes reads its colors from,
// by the role they play.
const THEME_VARIABLES: Record< string, Array< [ string, ColorRole ] > > = {
	default: [
		[ '--bgColor-default', 'background' ],
		[ '--fgColor-default', 'foreground' ],
		[ '--h1-color', 'foreground' ],
		[ '--fgColor-accent', 'accent' ],
		[ '--heading-strong-color', 'accent' ],
		[ '--fgColor-muted', 'muted' ],
		[ '--header-footer-color', 'muted' ],
		[ '--paginate-color', 'muted' ],
	],
	gaia: [
		[ '--color-background', 'background' ],
		[ '--color-foreground', 'foreground' ],
		[ '--color-highlight', 'accent' ],
		[ '--color-dimmed', 'muted' ],
	],
	uncover: [
		[ '--color-background', 'background' ],
		[ '--color-foreground', 'foreground' ],
		[ '--color-highlight', 'accent' ],
		[ '--color-highlight-hover', 'accent' ],
		[ '--color-highlight-heading', 'accent' ],
		[ '--color-header', 'muted' ],
	],
};

const MARKER = 'mark-bricks-color-scheme';
const BLOCK_PATTERN = new RegExp(
	`/\\* ${ MARKER }: ([\\w-]+) \\*/[\\s\\S]*?/\\* /${ MARKER } \\*/\\n?`
);

/**
 * Whether a theme is one of Marp's built-in themes, which are the ones a
 * color scheme can be applied to.
 *
 * @param theme Theme name.
 * @return Whether color schemes support the theme.
 */
export function supportsMarpColorScheme( theme: string ): boolean {
	return Object.prototype.hasOwnProperty.call( THEME_VARIABLES, theme );
}

/**
 * Builds the CSS that applies a color scheme to a built-in theme, wrapped
 * in comments that mark it as written by the editor.
 *
 * @param scheme Color scheme.
 * @param theme  Built-in theme name.
 * @return The CSS block.
 */
export function buildMarpColorSchemeCSS(
	scheme: MarpColorScheme,
	theme: string
): string {
	const variables = THEME_VARIABLES[ theme ] ?? THEME_VARIABLES.default;
	return [
		`/* ${ MARKER }: ${ scheme.id } */`,
		'section {',
		`  color-scheme: ${ scheme.colorScheme };`,
		...variables.map(
			( [ name, role ] ) => `  ${ name }: ${ scheme.colors[ role ] };`
		),
		'}',
		`/* /${ MARKER } */`,
	].join( '\n' );
}

/**
 * Reads which color scheme the front matter's `style` applies.
 *
 * @param frontMatter Front matter content, or `null` when there is none.
 * @return The color scheme, or `null` when none is applied.
 */
export function getMarpColorScheme(
	frontMatter: string | null
): MarpColorScheme | null {
	const style = getFrontMatterBlockValue( frontMatter, 'style' );
	const id = style ? BLOCK_PATTERN.exec( style )?.[ 1 ] : undefined;
	return MARP_COLOR_SCHEMES.find( ( scheme ) => scheme.id === id ) ?? null;
}

/**
 * Applies a color scheme by writing its CSS at the start of the front
 * matter's `style`, so that CSS written by hand after it still wins. Any
 * CSS outside the editor's own block is left as it is.
 *
 * @param frontMatter Front matter content.
 * @param theme       Theme name the CSS is written for.
 * @param id          Color scheme ID, or `null` to remove the scheme.
 * @return The updated front matter content.
 */
export function setMarpColorScheme(
	frontMatter: string,
	theme: string,
	id: string | null
): string {
	const style = getFrontMatterBlockValue( frontMatter, 'style' ) ?? '';
	const rest = style.replace( BLOCK_PATTERN, '' ).replace( /^\n+/, '' );
	const scheme = MARP_COLOR_SCHEMES.find( ( item ) => item.id === id );
	if ( ! scheme ) {
		return style === rest
			? frontMatter
			: setFrontMatterBlockValue( frontMatter, 'style', rest || null );
	}
	const block = buildMarpColorSchemeCSS( scheme, theme );
	return setFrontMatterBlockValue(
		frontMatter,
		'style',
		rest ? `${ block }\n\n${ rest }` : block
	);
}

/**
 * Whether CSS written by hand in the front matter's `style` sets one of
 * the variables the color scheme writes for the theme, which then takes
 * precedence over the scheme.
 *
 * @param frontMatter Front matter content, or `null` when there is none.
 * @param theme       Theme name.
 * @return Whether the scheme is partly overridden.
 */
export function isMarpColorSchemeOverridden(
	frontMatter: string | null,
	theme: string
): boolean {
	const style = getFrontMatterBlockValue( frontMatter, 'style' );
	const variables = THEME_VARIABLES[ theme ];
	if ( ! style || ! variables ) {
		return false;
	}
	const rest = style.replace( BLOCK_PATTERN, '' );
	return variables.some( ( [ name ] ) =>
		new RegExp( `${ name }\\s*:` ).test( rest )
	);
}
