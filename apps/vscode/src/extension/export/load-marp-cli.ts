/**
 * External dependencies
 */
import * as path from 'node:path';

export type MarpCliModule = typeof import( './marp-cli' );

// The path of the bundled Marp CLI, beside the extension's own bundle.
export function getMarpCliPath( extensionPath: string ): string {
	return path.join( extensionPath, 'dist', 'marp-cli.cjs' );
}

// Loads the bundled Marp CLI. A plain `require` of a path esbuild cannot see,
// so the extension's bundle does not include Marp CLI.
export function loadMarpCli( extensionPath: string ): MarpCliModule {
	return require( getMarpCliPath( extensionPath ) );
}
