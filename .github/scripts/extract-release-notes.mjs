import { appendFileSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const [ changelogPath, version ] = process.argv.slice( 2 );
if ( ! changelogPath || ! version ) {
	throw new Error(
		'Usage: extract-release-notes.mjs <changelog-path> <version>'
	);
}

const lines = readFileSync( changelogPath, 'utf8' ).split( /\r?\n/ );

// conventional-changelog writes `# [x.y.z](...)` for minor/major releases and
// `## [x.y.z](...)` for patch releases.
const isVersionHeading = ( line ) => /^#{1,2} \[?\d+\.\d+\.\d+/.test( line );
const escapedVersion = version.replace( /[.+]/g, '\\$&' );
const start = lines.findIndex(
	( line ) =>
		isVersionHeading( line ) &&
		new RegExp( `^#{1,2} \\[?${ escapedVersion }\\]?[ (]` ).test( line )
);
if ( start === -1 ) {
	throw new Error( `No entry for ${ version } found in ${ changelogPath }.` );
}

const end = lines.findIndex(
	( line, index ) => index > start && isVersionHeading( line )
);
const notes = lines
	.slice( start + 1, end === -1 ? undefined : end )
	.join( '\n' )
	.trim();
if ( ! notes ) {
	throw new Error( `The ${ version } entry in ${ changelogPath } is empty.` );
}

if ( process.env.GITHUB_OUTPUT ) {
	const delimiter = `EOF_${ randomUUID() }`;
	appendFileSync(
		process.env.GITHUB_OUTPUT,
		`notes<<${ delimiter }\n${ notes }\n${ delimiter }\n`
	);
} else {
	console.log( notes );
}
