import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );
const tauriAppRoot = path.resolve( __dirname, '..' );
const binaryName =
	process.platform === 'win32' ? 'mark-bricks.exe' : 'mark-bricks';
const application = path.join(
	tauriAppRoot,
	'src-tauri',
	'target',
	'debug',
	binaryName
);

let tauriDriver: ChildProcess | null = null;

export const config: WebdriverIO.Config = {
	runner: 'local',
	specs: [ './specs/**/*.e2e.ts' ],
	maxInstances: 1,
	capabilities: [
		{
			browserName: 'wry',
			'tauri:options': { application },
		} as WebdriverIO.Capabilities,
	],
	reporters: [ 'spec' ],
	framework: 'mocha',
	mochaOpts: {
		ui: 'bdd',
		timeout: 60_000,
	},
	hostname: '127.0.0.1',
	port: 4444,
	logLevel: 'info',
	waitforTimeout: 10_000,
	connectionRetryTimeout: 120_000,
	connectionRetryCount: 3,

	onPrepare: () => {
		if ( process.env.SKIP_TAURI_BUILD === '1' ) {
			return;
		}
		const result = spawnSync(
			'pnpm',
			[
				'--filter',
				'mark-bricks-desktop',
				'exec',
				'tauri',
				'build',
				'--debug',
				'--no-bundle',
			],
			{ cwd: tauriAppRoot, stdio: 'inherit', shell: true }
		);
		if ( result.status !== 0 ) {
			throw new Error(
				`tauri build failed with exit code ${ result.status }`
			);
		}
		if ( ! existsSync( application ) ) {
			throw new Error(
				`Tauri debug binary not found at ${ application }`
			);
		}
	},

	beforeSession: () => {
		const tauriDriverPath = path.resolve(
			os.homedir(),
			'.cargo',
			'bin',
			process.platform === 'win32' ? 'tauri-driver.exe' : 'tauri-driver'
		);
		tauriDriver = spawn( tauriDriverPath, [], {
			stdio: [ 'ignore', 'pipe', 'pipe' ],
		} );
		tauriDriver.stdout?.on( 'data', ( chunk ) =>
			process.stdout.write( `[tauri-driver] ${ chunk }` )
		);
		tauriDriver.stderr?.on( 'data', ( chunk ) =>
			process.stderr.write( `[tauri-driver] ${ chunk }` )
		);
	},

	afterSession: () => {
		tauriDriver?.kill();
		tauriDriver = null;
	},
};
