/**
 * External dependencies
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * A message in a conversation with the AI assistant.
 */
export type AiMessage =
	| {
			role: 'user';
			text: string;
	  }
	| {
			role: 'assistant';
			text: string;
			/**
			 * The edit the assistant made to the document while answering,
			 * if any. The host sends it back to the model as part of the
			 * conversation.
			 */
			edit?: AiEdit;
	  };

/**
 * An edit the AI assistant makes to the selection it was given.
 */
export type AiEdit = {
	/**
	 * `replace` replaces the selection, and `insert_after` inserts the
	 * Markdown after it.
	 */
	action: 'replace' | 'insert_after';
	markdown: string;
};

/**
 * What the model is doing while it is not writing text: `thinking` while it
 * reasons, and `editing` while it writes an edit of the selection.
 */
export type AiActivity = 'thinking' | 'editing';

/**
 * The tokens a request to the model used, as the provider counted them.
 */
export type AiUsage = {
	/**
	 * The tokens the model read, including the conversation and the
	 * instructions sent with it.
	 */
	inputTokens: number;
	/**
	 * The tokens the model wrote, including its thinking.
	 */
	outputTokens: number;
};

/**
 * What the host reports while the model answers.
 */
export type AiStreamEvent =
	| {
			/**
			 * A piece of the answer's text, to append to what came before.
			 */
			type: 'text';
			text: string;
	  }
	| {
			/**
			 * The model edited the selection.
			 */
			type: 'edit';
			edit: AiEdit;
	  }
	| {
			/**
			 * The model started something other than text. Text that
			 * follows ends it. Hosts that cannot tell may leave it out.
			 */
			type: 'activity';
			activity: AiActivity;
	  }
	| {
			/**
			 * What a request to the model used. An answer may take more
			 * than one request, each reported once. Hosts that cannot tell
			 * may leave it out.
			 */
			type: 'usage';
			usage: AiUsage;
	  };

export type AiChatRequest = {
	/**
	 * Instructions for the model, including the selection and the
	 * document it belongs to.
	 */
	system: string;
	/**
	 * The conversation so far, ending with the user's new message.
	 */
	messages: AiMessage[];
	/**
	 * Called for each event while the model answers.
	 */
	onEvent: ( event: AiStreamEvent ) => void;
	/**
	 * Aborted when the user stops the answer.
	 */
	signal: AbortSignal;
};

/**
 * Connects the AI assistant to a model. The host keeps the API key and
 * sends the requests, so the editor never sees the key.
 */
export type AiPlatform = {
	/**
	 * Resolves with whether the user has set an API key.
	 */
	hasApiKey: () => Promise< boolean >;
	/**
	 * Sends the conversation to the model and streams its answer through
	 * `onEvent`. Resolves when the answer ends, and rejects when the
	 * request fails. When `signal` is aborted, rejects with an
	 * `AbortError`.
	 */
	chat: ( request: AiChatRequest ) => Promise< void >;
	/**
	 * Opens the host's settings where the user sets the API key. Omitted
	 * when the host has no such place.
	 */
	openSettings?: () => void;
};

/**
 * Platform integration points that depend on the host environment
 * (Tauri, VS Code, …). The editor stays environment-agnostic and only
 * calls these callbacks; each host app injects its own implementation.
 */
export type Platform = {
	/**
	 * Opens a native image file picker and resolves with the path to
	 * store in the block, or `null` when the user cancels.
	 */
	pickImageFile?: () => Promise< string | null >;
	/**
	 * Converts a stored path into a URL the current webview can render
	 * in an `<img>` tag. Async because some hosts (e.g. VS Code) must
	 * round-trip to the extension process to resolve it.
	 */
	resolveImageSrc: ( path: string ) => Promise< string >;
	/**
	 * Resolves with a notice when the host cannot display the image at
	 * this path, or `null` when it can. Omitted when any path works.
	 */
	getImageNotice?: ( path: string ) => Promise< string | null >;
	/**
	 * Converts the URL of an asset bundled with the editor, such as a KaTeX
	 * font, into one the block canvas can load. Omitted when the canvas can
	 * load the bundled URLs.
	 */
	resolveAssetUrl?: ( url: string ) => Promise< string >;
	/**
	 * Opens an external URL, such as a documentation link, in the system
	 * browser. Omitted when the host opens links with `target="_blank"`
	 * itself.
	 */
	openUrl?: ( url: string ) => void;
	/**
	 * Connects the AI assistant to a model. Omitted when the host does not
	 * offer the assistant, which hides it.
	 */
	ai?: AiPlatform;
};

const defaultPlatform: Platform = {
	resolveImageSrc: async ( path ) => path,
};

const PlatformContext = createContext< Platform >( defaultPlatform );

type Props = {
	platform?: Partial< Platform >;
	children: ReactNode;
};

export function PlatformProvider( { platform, children }: Props ) {
	const value = useMemo< Platform >(
		() => ( { ...defaultPlatform, ...platform } ),
		[ platform ]
	);
	return (
		<PlatformContext.Provider value={ value }>
			{ children }
		</PlatformContext.Provider>
	);
}

export function usePlatform() {
	return useContext( PlatformContext );
}

/**
 * Returns the host's notice for an image path it cannot display, or `null`.
 *
 * @param path Image path or URL as entered.
 */
export function useImageNotice( path: string ): string | null {
	const { getImageNotice } = usePlatform();
	const [ notice, setNotice ] = useState< string | null >( null );

	useEffect( () => {
		const target = path.trim();
		if ( ! getImageNotice || ! target ) {
			setNotice( null );
			return;
		}

		let cancelled = false;
		getImageNotice( target ).then( ( nextNotice ) => {
			if ( ! cancelled ) {
				setNotice( nextNotice );
			}
		} );
		return () => {
			cancelled = true;
		};
	}, [ path, getImageNotice ] );

	return notice;
}
