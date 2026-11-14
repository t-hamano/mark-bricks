/**
 * External dependencies
 */
import { describe, it, expect } from 'vitest';

/**
 * Internal dependencies
 */
import {
	isValidMarpLength,
	parseMarpImageAlt,
	serializeMarpImageAlt,
} from './marp-image-options';

describe( 'parseMarpImageAlt', () => {
	it( 'keeps plain text as the text', () => {
		expect( parseMarpImageAlt( 'A cat on a sofa' ) ).toEqual( {
			background: false,
			filters: [],
			text: 'A cat on a sofa',
		} );
	} );

	it( 'reads the size and filters of an inline image', () => {
		expect(
			parseMarpImageAlt( 'Logo w:200px h:30% sepia blur:5px' )
		).toEqual( {
			background: false,
			width: '200px',
			height: '30%',
			filters: [
				{ name: 'sepia', value: '' },
				{ name: 'blur', value: '5px' },
			],
			text: 'Logo',
		} );
	} );

	it( 'reads the long forms of width and height', () => {
		expect( parseMarpImageAlt( 'width:200 height:auto' ) ).toMatchObject( {
			width: '200',
			height: 'auto',
			text: '',
		} );
	} );

	it( 'reads the background keywords', () => {
		expect(
			parseMarpImageAlt( 'bg right:40% contain vertical Caption' )
		).toEqual( {
			background: true,
			split: 'right',
			splitSize: '40%',
			size: 'contain',
			direction: 'vertical',
			filters: [],
			text: 'Caption',
		} );
	} );

	it( 'reads keywords anywhere in the text', () => {
		expect( parseMarpImageAlt( 'Caption left bg 50%' ) ).toMatchObject( {
			background: true,
			split: 'left',
			scale: '50%',
			text: 'Caption',
		} );
	} );

	it( 'keeps a scale and a size keyword apart', () => {
		const options = parseMarpImageAlt( 'bg 50% contain Caption' );
		expect( options ).toMatchObject( { size: 'contain', scale: '50%' } );
		expect( serializeMarpImageAlt( options ) ).toBe(
			'bg contain 50% Caption'
		);
	} );

	it( 'keeps background keywords as text without bg', () => {
		expect( parseMarpImageAlt( 'left fit vertical' ) ).toEqual( {
			background: false,
			filters: [],
			text: 'left fit vertical',
		} );
	} );

	it( 'keeps words Marp does not read as text', () => {
		expect( parseMarpImageAlt( 'BG w:big drop-shadow:1px Hello' ) ).toEqual(
			{
				background: false,
				filters: [],
				text: 'BG w:big drop-shadow:1px Hello',
			}
		);
	} );

	it( 'reads a drop shadow with several values', () => {
		expect(
			parseMarpImageAlt( 'drop-shadow:0,5px,10px,rgba(0,0,0,.4)' ).filters
		).toEqual( [
			{ name: 'drop-shadow', value: '0,5px,10px,rgba(0,0,0,.4)' },
		] );
	} );
} );

describe( 'serializeMarpImageAlt', () => {
	it( 'writes the keywords before the text', () => {
		expect(
			serializeMarpImageAlt( {
				background: true,
				split: 'left',
				splitSize: '30%',
				size: 'fit',
				width: '200px',
				direction: 'vertical',
				filters: [
					{ name: 'grayscale', value: '' },
					{ name: 'opacity', value: '0.5' },
				],
				text: 'Caption',
			} )
		).toBe(
			'bg left:30% fit w:200px vertical grayscale opacity:0.5 Caption'
		);
	} );

	it( 'leaves out the background keywords for an inline image', () => {
		expect(
			serializeMarpImageAlt( {
				background: false,
				split: 'right',
				size: 'cover',
				direction: 'vertical',
				height: '30%',
				filters: [],
				text: 'Logo',
			} )
		).toBe( 'h:30% Logo' );
	} );

	it( 'drops spaces from a filter value', () => {
		expect(
			serializeMarpImageAlt( {
				background: false,
				filters: [ { name: 'drop-shadow', value: '0, 5px, 10px' } ],
				text: '',
			} )
		).toBe( 'drop-shadow:0,5px,10px' );
	} );

	it( 'round-trips through the parser', () => {
		const alt = 'bg right:40% w:300px sepia:50% Caption text';
		expect( serializeMarpImageAlt( parseMarpImageAlt( alt ) ) ).toBe( alt );
	} );
} );

describe( 'isValidMarpLength', () => {
	it.each( [ '200px', '30%', '200', '1.5em', 'auto' ] )(
		'accepts %s',
		( value ) => {
			expect( isValidMarpLength( value ) ).toBe( true );
		}
	);

	it.each( [ '', '200rem', 'big', '-1px' ] )( 'rejects %s', ( value ) => {
		expect( isValidMarpLength( value ) ).toBe( false );
	} );
} );
