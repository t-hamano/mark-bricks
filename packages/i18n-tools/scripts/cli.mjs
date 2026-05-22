#!/usr/bin/env node
import path from 'node:path';
import { makePot } from './make-pot.mjs';
import { makePo } from './make-po.mjs';
import { makeJson } from './make-json.mjs';

const USAGE = `Usage:
  mb-i18n make-pot  [--slug=<slug>] [--root=<dir>] [--include=<glob>]
  mb-i18n make-po   [locale] [--slug=<slug>] [--root=<dir>]
  mb-i18n make-json [locale] [--slug=<slug>] [--root=<dir>] [--gutenberg]

Defaults: locale=ja, slug=mark-bricks, root=cwd, include=src/**`;

function parseArgs( argv ) {
	const flags = {};
	const positionals = [];
	for ( const arg of argv ) {
		if ( arg.startsWith( '--' ) ) {
			const [ key, value ] = arg.slice( 2 ).split( '=' );
			flags[ key ] = value === undefined ? true : value;
		} else {
			positionals.push( arg );
		}
	}
	return { flags, positionals };
}

async function main() {
	const [ command, ...rest ] = process.argv.slice( 2 );
	const { flags, positionals } = parseArgs( rest );

	const root = flags.root ? path.resolve( flags.root ) : process.cwd();
	const slug = flags.slug ?? 'mark-bricks';
	const locale = positionals[ 0 ] ?? 'ja';

	switch ( command ) {
		case 'make-pot':
			await makePot( {
				root,
				slug,
				include:
					typeof flags.include === 'string'
						? flags.include
						: undefined,
			} );
			break;
		case 'make-po':
			await makePo( { root, slug, locale } );
			break;
		case 'make-json':
			await makeJson( {
				root,
				slug,
				locale,
				includeGutenberg: Boolean( flags.gutenberg ),
			} );
			break;
		default:
			console.error( USAGE );
			process.exit( 1 );
	}
}

main().catch( ( err ) => {
	console.error( '❌', err );
	process.exit( 1 );
} );
