/**
 * External dependencies
 */
import { vi } from 'vitest';
import { URI, Utils } from 'vscode-uri';

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

// The implementation VS Code itself uses.
export type Uri = URI;
export const Uri = {
	file: URI.file,
	parse: URI.parse,
	joinPath: Utils.joinPath,
};

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

export class Disposable {
	public constructor( private readonly callOnDispose: () => void ) {}

	public static from( ...disposables: { dispose: () => void }[] ) {
		return new Disposable( () => {
			for ( const disposable of disposables ) {
				disposable.dispose();
			}
		} );
	}

	public dispose(): void {
		this.callOnDispose();
	}
}

export enum ViewColumn {
	Beside = -2,
}

export class TabInputText {
	public constructor( public readonly uri: Uri ) {}
}

export class TabInputCustom {
	public constructor(
		public readonly uri: Uri,
		public readonly viewType: string
	) {}
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
		private text: string,
		public readonly languageId = 'markdown'
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

/**
 * A webview panel as `createWebviewPanel` returns it, recording what the
 * host posts and letting tests play the webview's side.
 */
export class FakeWebviewPanel {
	public title = '';
	public readonly posted: unknown[] = [];
	public readonly reveal = vi.fn();
	private readonly messages = new EventEmitter< unknown >();
	private readonly disposed = new EventEmitter< void >();
	public readonly onDidDispose = this.disposed.event;
	public readonly webview = {
		options: {} as { localResourceRoots?: Uri[] },
		html: '',
		cspSource: 'vscode-webview:',
		onDidReceiveMessage: this.messages.event,
		postMessage: async ( message: unknown ) => {
			this.posted.push( message );
			return true;
		},
		asWebviewUri: ( uri: Uri ) => ( {
			toString: () => `webview:${ uri.toString() }`,
		} ),
	};

	public constructor(
		public readonly viewType: string,
		public readonly showOptions?: unknown,
		public readonly options?: unknown
	) {}

	// Sends a message from the webview to the host.
	public send( message: unknown ): void {
		this.messages.fire( message );
	}

	public dispose(): void {
		this.disposed.fire();
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
		onDidOpenTextDocument: new EventEmitter< FakeTextDocument >(),
		onDidChangeTabs: new EventEmitter< void >(),
		onDidChangeTabGroups: new EventEmitter< void >(),
		activeTabInput: undefined as unknown,
		webviewPanels: [] as FakeWebviewPanel[],
		webviewPanelSerializers: new Map< string, unknown >(),
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
	get textDocuments() {
		return state.documents;
	},
	openTextDocument: vi.fn(),
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
	onDidOpenTextDocument: ( listener: Listener< FakeTextDocument > ) =>
		state.onDidOpenTextDocument.event( listener ),
};

export const window = {
	registerCustomEditorProvider: vi.fn(),
	showErrorMessage: vi.fn(),
	showOpenDialog: vi.fn(),
	createWebviewPanel: vi.fn(),
	registerWebviewPanelSerializer: vi.fn(),
	tabGroups: {
		get activeTabGroup() {
			return {
				activeTab:
					state.activeTabInput === undefined
						? undefined
						: { input: state.activeTabInput },
			};
		},
		onDidChangeTabs: ( listener: Listener< void > ) =>
			state.onDidChangeTabs.event( listener ),
		onDidChangeTabGroups: ( listener: Listener< void > ) =>
			state.onDidChangeTabGroups.event( listener ),
	},
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
	workspace.openTextDocument.mockImplementation( async ( uri: Uri ) => {
		const document = state.documents.find(
			( item ) => item.uri.toString() === uri.toString()
		);
		if ( ! document ) {
			throw new Error( `cannot open ${ uri.toString() }` );
		}
		return document;
	} );
	window.createWebviewPanel.mockImplementation(
		( viewType: string, _title: string, showOptions, options ) => {
			const panel = new FakeWebviewPanel(
				viewType,
				showOptions,
				options
			);
			state.webviewPanels.push( panel );
			return panel;
		}
	);
	window.registerWebviewPanelSerializer.mockImplementation(
		( viewType: string, serializer: unknown ) => {
			state.webviewPanelSerializers.set( viewType, serializer );
			return { dispose: () => {} };
		}
	);
	window.registerCustomEditorProvider.mockImplementation(
		( viewType: string, provider: unknown ) => {
			state.customEditorProviders.set( viewType, provider );
			return { dispose: () => {} };
		}
	);
}

export function createDocument(
	fsPath: string,
	text: string,
	languageId?: string
) {
	const document = new FakeTextDocument(
		Uri.file( fsPath ),
		text,
		languageId
	);
	state.documents.push( document );
	return document;
}

/**
 * Makes a tab with the given input the active one, notifying
 * `onDidChangeTabs` listeners.
 *
 * @param input Input of the tab, or `undefined` for no active tab.
 */
export function setActiveTab( input: unknown ): void {
	state.activeTabInput = input;
	state.onDidChangeTabs.fire();
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

export function getWebviewPanels(): FakeWebviewPanel[] {
	return state.webviewPanels;
}

export function getWebviewPanelSerializer( viewType: string ): unknown {
	return state.webviewPanelSerializers.get( viewType );
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

export function fireOpenDocument( document: FakeTextDocument ): void {
	state.onDidOpenTextDocument.fire( document );
}

export function getListenerCount(): number {
	return (
		state.onDidChangeTextDocument.listenerCount +
		state.onWillSaveTextDocument.listenerCount +
		state.onDidChangeConfiguration.listenerCount +
		state.onDidOpenTextDocument.listenerCount
	);
}
