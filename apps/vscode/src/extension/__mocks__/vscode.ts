/**
 * External dependencies
 */
import { posix } from 'node:path';
import { vi } from 'vitest';

/**
 * A minimal stand-in for the `vscode` module, which only exists inside the
 * extension host. `vitest.config.ts` aliases `vscode` to this file; tests
 * import it by path for the helpers that drive and inspect it, and call
 * `resetVscode()` before each test.
 */

type Listener< T > = ( event: T ) => void;

export class EventEmitter< T > {
	private listeners: Listener< T >[] = [];

	public readonly event = ( listener: Listener< T > ) => {
		this.listeners.push( listener );
		return {
			dispose: () => {
				this.listeners = this.listeners.filter(
					( item ) => item !== listener
				);
			},
		};
	};

	public fire( event: T ): void {
		for ( const listener of [ ...this.listeners ] ) {
			listener( event );
		}
	}

	public get listenerCount(): number {
		return this.listeners.length;
	}
}

// Paths are POSIX-style regardless of the host OS, as in VS Code's own `Uri`.
export class Uri {
	private constructor(
		public readonly scheme: string,
		public readonly path: string
	) {}

	public static file( fsPath: string ): Uri {
		return new Uri( 'file', fsPath.replace( /\\/g, '/' ) );
	}

	public static parse( value: string ): Uri {
		const match = /^([a-z][\w+.-]*):(?:\/\/[^/]*)?(.*)$/i.exec( value );
		if ( ! match ) {
			throw new Error( `Invalid URI: ${ value }` );
		}
		return new Uri( match[ 1 ].toLowerCase(), match[ 2 ] );
	}

	public static joinPath( base: Uri, ...segments: string[] ): Uri {
		return new Uri( base.scheme, posix.join( base.path, ...segments ) );
	}

	public get fsPath(): string {
		return this.path;
	}

	public toString(): string {
		return `${ this.scheme }://${ this.path }`;
	}
}

export class Range {
	public constructor(
		public readonly start: number,
		public readonly end: number
	) {}
}

export class TextEdit {
	private constructor(
		public readonly range: Range,
		public readonly newText: string
	) {}

	public static replace( range: Range, newText: string ): TextEdit {
		return new TextEdit( range, newText );
	}
}

export class WorkspaceEdit {
	public readonly edits: { uri: Uri; range: Range; newText: string }[] = [];

	public replace( uri: Uri, range: Range, newText: string ): void {
		this.edits.push( { uri, range, newText } );
	}
}

export enum ConfigurationTarget {
	Global = 1,
	Workspace = 2,
	WorkspaceFolder = 3,
}

export type TextDocumentChangeEvent = {
	document: FakeTextDocument;
	contentChanges: unknown[];
};

export type TextDocumentWillSaveEvent = {
	document: FakeTextDocument;
	waitUntil: ( thenable: Promise< TextEdit[] > ) => void;
};

export type ConfigurationChangeEvent = {
	affectsConfiguration: ( section: string, scope?: Uri ) => boolean;
};

export class FakeTextDocument {
	public constructor(
		public readonly uri: Uri,
		private text: string
	) {}

	public getText(): string {
		return this.text;
	}

	public positionAt( offset: number ): number {
		return offset;
	}

	/**
	 * Replaces the content the way an edit from outside the extension would,
	 * notifying `onDidChangeTextDocument` listeners.
	 *
	 * @param text New document text.
	 */
	public setText( text: string ): void {
		this.text = text;
		state.onDidChangeTextDocument.fire( {
			document: this,
			contentChanges: [ {} ],
		} );
	}
}

type ConfigValue = {
	globalValue?: unknown;
	workspaceValue?: unknown;
	workspaceFolderValue?: unknown;
};

function createState() {
	return {
		onDidChangeTextDocument: new EventEmitter< TextDocumentChangeEvent >(),
		onWillSaveTextDocument: new EventEmitter< TextDocumentWillSaveEvent >(),
		onDidChangeConfiguration:
			new EventEmitter< ConfigurationChangeEvent >(),
		documents: [] as FakeTextDocument[],
		workspaceFolders: [] as { uri: Uri }[],
		config: new Map< string, ConfigValue >(),
		customEditorProviders: new Map< string, unknown >(),
	};
}

let state = createState();

export const workspace = {
	get workspaceFolders() {
		return state.workspaceFolders.length
			? state.workspaceFolders
			: undefined;
	},
	getWorkspaceFolder( uri: Uri ) {
		return state.workspaceFolders.find( ( folder ) =>
			uri.path.startsWith( `${ folder.uri.path }/` )
		);
	},
	asRelativePath( uri: Uri ) {
		return uri.path;
	},
	getConfiguration: vi.fn(),
	applyEdit: vi.fn(),
	onDidChangeTextDocument: (
		listener: Listener< TextDocumentChangeEvent >
	) => state.onDidChangeTextDocument.event( listener ),
	onWillSaveTextDocument: (
		listener: Listener< TextDocumentWillSaveEvent >
	) => state.onWillSaveTextDocument.event( listener ),
	onDidChangeConfiguration: (
		listener: Listener< ConfigurationChangeEvent >
	) => state.onDidChangeConfiguration.event( listener ),
};

export const window = {
	registerCustomEditorProvider: vi.fn(),
	showErrorMessage: vi.fn(),
	showOpenDialog: vi.fn(),
};

export const commands = {
	executeCommand: vi.fn(),
};

export const env = {
	language: 'en',
};

export const l10n = {
	t: ( message: string, ...args: unknown[] ) =>
		message.replace( /\{(\d+)\}/g, ( _, index ) =>
			String( args[ Number( index ) ] )
		),
};

export const configurationUpdate = vi.fn();

function getConfiguration( section: string ) {
	const lookup = ( key: string ) =>
		state.config.get( `${ section }.${ key }` );
	return {
		get: ( key: string ) => {
			const value = lookup( key );
			return (
				value?.workspaceFolderValue ??
				value?.workspaceValue ??
				value?.globalValue
			);
		},
		inspect: ( key: string ) => lookup( key ),
		update: configurationUpdate,
	};
}

async function applyEdit( edit: WorkspaceEdit ): Promise< boolean > {
	for ( const { uri, newText } of edit.edits ) {
		const document = state.documents.find(
			( item ) => item.uri.toString() === uri.toString()
		);
		document?.setText( newText );
	}
	return true;
}

/**
 * Restores the module to a blank workspace: no documents, folders, settings
 * or listeners, and fresh mocks.
 */
export function resetVscode(): void {
	state = createState();
	vi.clearAllMocks();
	workspace.getConfiguration.mockImplementation( getConfiguration );
	workspace.applyEdit.mockImplementation( applyEdit );
	window.registerCustomEditorProvider.mockImplementation(
		( viewType: string, provider: unknown ) => {
			state.customEditorProviders.set( viewType, provider );
			return { dispose: () => {} };
		}
	);
}

export function createDocument( fsPath: string, text: string ) {
	const document = new FakeTextDocument( Uri.file( fsPath ), text );
	state.documents.push( document );
	return document;
}

export function addWorkspaceFolder( fsPath: string ): void {
	state.workspaceFolders.push( { uri: Uri.file( fsPath ) } );
}

/**
 * Sets a `section.key` setting at the given levels.
 *
 * @param key   Full setting key, including the section.
 * @param value Values per configuration level.
 */
export function setConfiguration( key: string, value: ConfigValue ): void {
	state.config.set( key, value );
}

export function getCustomEditorProvider( viewType: string ): unknown {
	return state.customEditorProviders.get( viewType );
}

export function fireWillSave( document: FakeTextDocument ) {
	const pending: Promise< TextEdit[] >[] = [];
	state.onWillSaveTextDocument.fire( {
		document,
		waitUntil: ( thenable ) => pending.push( thenable ),
	} );
	return pending;
}

export function fireConfigurationChange( sections: string[] ): void {
	state.onDidChangeConfiguration.fire( {
		affectsConfiguration: ( section ) => sections.includes( section ),
	} );
}

export function getListenerCount(): number {
	return (
		state.onDidChangeTextDocument.listenerCount +
		state.onWillSaveTextDocument.listenerCount +
		state.onDidChangeConfiguration.listenerCount
	);
}
