// The attribute that holds the line of the deck's Markdown an element starts
// at, counted from 0, as markdown-it counts it. The front matter's lines are
// counted too.
export const SOURCE_LINE_ATTRIBUTE = 'data-line';

// Block rules whose renderers write their own HTML, without the attributes of
// their token. Their first tag gets the line instead.
const SELF_RENDERED_RULES = [
	'fence',
	'code_block',
	'marp_math_block',
	'html_block',
];

const FIRST_TAG_PATTERN = /^(\s*<[a-z][\w-]*)/i;

type Token = {
	type: string;
	block: boolean;
	nesting: number;
	map: [ number, number ] | null;
	attrSet: ( name: string, value: string ) => void;
};

type RenderRule = ( tokens: Token[], index: number, ...rest: any[] ) => string;

type MarkdownIt = {
	core: {
		ruler: {
			push: (
				name: string,
				rule: ( state: { tokens: Token[] } ) => void
			) => void;
		};
	};
	renderer: { rules: Record< string, RenderRule | undefined > };
};

/**
 * A markdown-it plugin that marks the elements of the slides with the line of
 * the Markdown they start at, for the preview to match them with the source:
 * each slide, and the block elements in it, nested ones included.
 *
 * @param md The markdown-it instance of the Marp instance.
 */
export function sourceLines( md: MarkdownIt ): void {
	md.core.ruler.push( 'mark_bricks_source_lines', ( { tokens } ) => {
		for ( const token of tokens ) {
			if ( token.block && token.nesting === 1 && token.map ) {
				token.attrSet(
					SOURCE_LINE_ATTRIBUTE,
					String( token.map[ 0 ] )
				);
			}
		}
	} );

	for ( const name of SELF_RENDERED_RULES ) {
		const render = md.renderer.rules[ name ];
		if ( ! render ) {
			continue;
		}
		md.renderer.rules[ name ] = ( tokens, index, ...rest ) => {
			const html = render( tokens, index, ...rest );
			const map = tokens[ index ].map;
			return map
				? html.replace(
						FIRST_TAG_PATTERN,
						`$1 ${ SOURCE_LINE_ATTRIBUTE }="${ map[ 0 ] }"`
					)
				: html;
		};
	}
}
