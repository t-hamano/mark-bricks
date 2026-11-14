/**
 * External dependencies
 */
import { describe, it, expect } from 'vitest';

/**
 * Internal dependencies
 */
import {
	getMarpColorScheme,
	isMarpColorSchemeOverridden,
	setMarpColorScheme,
	supportsMarpColorScheme,
} from '.';

const INK_GAIA = [
	'style: |',
	'  /* mark-bricks-color-scheme: ink */',
	'  section {',
	'    color-scheme: dark;',
	'    --color-background: #0f172a;',
	'    --color-foreground: #e2e8f0;',
	'    --color-highlight: #38bdf8;',
	'    --color-dimmed: #94a3b8;',
	'  }',
	'  /* /mark-bricks-color-scheme */',
].join( '\n' );

describe( 'setMarpColorScheme', () => {
	it( 'adds style with the variables of the theme', () => {
		expect(
			setMarpColorScheme( 'marp: true\ntheme: gaia', 'gaia', 'ink' )
		).toBe( `marp: true\ntheme: gaia\n${ INK_GAIA }` );
	} );

	it( 'puts the scheme before CSS written by hand and keeps it', () => {
		const next = setMarpColorScheme(
			'marp: true\nstyle: |\n  section {\n    font-size: 34px;\n  }\npaginate: true',
			'gaia',
			'ink'
		);
		expect( next ).toBe(
			`marp: true\n${ INK_GAIA }\n\n  section {\n    font-size: 34px;\n  }\npaginate: true`
		);
	} );

	it( 'replaces an applied scheme', () => {
		const next = setMarpColorScheme(
			setMarpColorScheme( 'marp: true', 'gaia', 'ink' ),
			'gaia',
			'slate'
		);
		expect( getMarpColorScheme( next )?.id ).toBe( 'slate' );
		expect( next.match( /mark-bricks-color-scheme:/g ) ).toHaveLength( 1 );
	} );

	it( 'writes the variables of another theme', () => {
		const next = setMarpColorScheme(
			setMarpColorScheme( 'marp: true', 'gaia', 'ink' ),
			'default',
			'ink'
		);
		expect( next ).toContain( '--bgColor-default: #0f172a;' );
		expect( next ).not.toContain( '--color-background' );
	} );

	it( 'removes style when only the scheme was in it', () => {
		expect(
			setMarpColorScheme(
				setMarpColorScheme( 'marp: true', 'gaia', 'ink' ),
				'gaia',
				null
			)
		).toBe( 'marp: true' );
	} );

	it( 'keeps CSS written by hand when removing the scheme', () => {
		const original =
			'marp: true\nstyle: |\n  section {\n    font-size: 34px;\n  }';
		expect(
			setMarpColorScheme(
				setMarpColorScheme( original, 'gaia', 'ink' ),
				'gaia',
				null
			)
		).toBe( original );
	} );

	it( 'leaves front matter without a scheme as it is', () => {
		const original = 'marp: true\nstyle: "section { color: red; }"';
		expect( setMarpColorScheme( original, 'gaia', null ) ).toBe( original );
	} );
} );

describe( 'getMarpColorScheme', () => {
	it( 'returns null without a scheme', () => {
		expect( getMarpColorScheme( null ) ).toBeNull();
		expect(
			getMarpColorScheme( 'style: |\n  section { color: red; }' )
		).toBeNull();
	} );
} );

describe( 'isMarpColorSchemeOverridden', () => {
	it( 'detects a variable set by hand after the scheme', () => {
		const next = setMarpColorScheme(
			'style: |\n  section {\n    --color-highlight: red;\n  }',
			'gaia',
			'ink'
		);
		expect( isMarpColorSchemeOverridden( next, 'gaia' ) ).toBe( true );
		expect(
			isMarpColorSchemeOverridden(
				setMarpColorScheme( 'marp: true', 'gaia', 'ink' ),
				'gaia'
			)
		).toBe( false );
	} );
} );

describe( 'supportsMarpColorScheme', () => {
	it( 'supports only the built-in themes', () => {
		expect( supportsMarpColorScheme( 'uncover' ) ).toBe( true );
		expect( supportsMarpColorScheme( 'my-theme' ) ).toBe( false );
		expect( supportsMarpColorScheme( 'constructor' ) ).toBe( false );
	} );
} );
