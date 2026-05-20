import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname( fileURLToPath( import.meta.url ) );
const rootDir = resolve( __dirname, '..' );

const pkgPath = resolve( rootDir, 'package.json' );
const cargoTomlPath = resolve( rootDir, 'src-tauri/Cargo.toml' );
const cargoLockPath = resolve( rootDir, 'src-tauri/Cargo.lock' );
const tauriConfPath = resolve( rootDir, 'src-tauri/tauri.conf.json' );

const pkg = JSON.parse( readFileSync( pkgPath, 'utf8' ) );
const version = pkg.version;

if ( ! /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test( version ) ) {
	throw new Error( `Invalid version in package.json: ${ version }` );
}

// Cargo.lock indexes its entry by the Rust crate name, which is taken from
// Cargo.toml's [package].name and may differ from package.json's name.
const cargoTomlSource = readFileSync( cargoTomlPath, 'utf8' );
const crateNameMatch = cargoTomlSource.match(
	/\[package\][\s\S]*?\nname\s*=\s*"([^"]+)"/
);
if ( ! crateNameMatch ) {
	throw new Error( `Could not find [package].name in ${ cargoTomlPath }` );
}
const crateName = crateNameMatch[ 1 ];

const replaceInFile = ( path, pattern, replacement ) => {
	const before = readFileSync( path, 'utf8' );
	if ( ! pattern.test( before ) ) {
		throw new Error( `No match for ${ pattern } in ${ path }` );
	}
	const after = before.replace( pattern, replacement );
	if ( before !== after ) {
		writeFileSync( path, after );
	}
};

// src-tauri/Cargo.toml: the first `version = "..."` after `[package]`.
replaceInFile(
	cargoTomlPath,
	/(\[package\][\s\S]*?\nversion\s*=\s*")[^"]+(")/,
	`$1${ version }$2`
);

// src-tauri/Cargo.lock: the `version` line that follows `name = "<crateName>"`.
replaceInFile(
	cargoLockPath,
	new RegExp(
		`(name\\s*=\\s*"${ crateName }"\\s*\\nversion\\s*=\\s*")[^"]+(")`
	),
	`$1${ version }$2`
);

// src-tauri/tauri.conf.json: top-level `version` field. Keep JSON formatting (tabs).
const tauriConf = JSON.parse( readFileSync( tauriConfPath, 'utf8' ) );
tauriConf.version = version;
writeFileSync( tauriConfPath, JSON.stringify( tauriConf, null, '\t' ) + '\n' );

console.log( `Bumped version to ${ version }` );
