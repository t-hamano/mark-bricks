import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname( fileURLToPath( import.meta.url ) );
const readmePath = resolve( __dirname, '../../README.md' );

const tag = process.argv[ 2 ];
if ( ! tag ) {
	throw new Error( 'Usage: update-download-links.mjs <release-tag>' );
}

const repo = process.env.GITHUB_REPOSITORY || 't-hamano/mark-bricks';
const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';

const platforms = [
	{
		id: 'windows',
		text: 'Installer (`.exe`)',
		match: /_x64-setup\.exe$/,
	},
	{
		id: 'macos',
		text: 'Disk image (`.dmg`)',
		match: /\.dmg$/,
	},
	{
		id: 'linux',
		text: 'AppImage',
		match: /\.AppImage$/,
	},
];

const assetsJson = execFileSync(
	'gh',
	[ 'release', 'view', tag, '--repo', repo, '--json', 'assets' ],
	{ encoding: 'utf8' }
);
const assets = JSON.parse( assetsJson ).assets.map( ( asset ) => asset.name );

const escapeRegExp = ( value ) =>
	value.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );

let readme = readFileSync( readmePath, 'utf8' );

for ( const { id, text, match } of platforms ) {
	const asset = assets.find( ( name ) => match.test( name ) );
	if ( ! asset ) {
		throw new Error(
			`No asset matching ${ match } found in release ${ tag }.`
		);
	}
	const url = `${ serverUrl }/${ repo }/releases/download/${ tag }/${ asset }`;
	const open = `<!-- download:${ id } -->`;
	const close = `<!-- /download:${ id } -->`;
	const region = new RegExp(
		`${ escapeRegExp( open ) }[\\s\\S]*?${ escapeRegExp( close ) }`
	);
	if ( ! region.test( readme ) ) {
		throw new Error(
			`Could not find the ${ id } download markers in ${ readmePath }.`
		);
	}
	readme = readme.replace(
		region,
		`${ open }[${ text }](${ url })${ close }`
	);
}

writeFileSync( readmePath, readme );
console.log( `Updated README download links to ${ tag }.` );
