#!/usr/bin/env node
import { makePot } from './make-pot.mjs';
import { makePo } from './make-po.mjs';
import { makeJson } from './make-json.mjs';

const USAGE = `Usage:
  mb-i18n make-pot
  mb-i18n make-po   [locale]
  mb-i18n make-json

Runs in the current package directory for the \`mark-bricks\` text domain.
make-po defaults to locale \`ja\`; make-json builds every locale found on disk.`;

const TEXT_DOMAIN = 'mark-bricks';

async function main() {
	const [ command, ...rest ] = process.argv.slice( 2 );
	const root = process.cwd();
	const slug = TEXT_DOMAIN;
	const locale = rest.find( ( arg ) => ! arg.startsWith( '-' ) ) ?? 'ja';

	switch ( command ) {
		case 'make-pot':
			await makePot( { root, slug } );
			break;
		case 'make-po':
			await makePo( { root, slug, locale } );
			break;
		case 'make-json':
			await makeJson( { root, slug } );
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
