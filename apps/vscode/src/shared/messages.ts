/**
 * The protocol between the extension host and the webview.
 *
 * Both sides import this module, so neither end can change a message shape
 * without the other failing to type-check.
 */

/** Sent by the extension host to the webview. */
export type HostMessage =
	| {
			/** The document's text, once the webview reports itself ready. */
			type: 'init';
			text: string;
	  }
	| {
			/** The document changed outside the webview. */
			type: 'update';
			text: string;
	  }
	| {
			/**
			 * Asks the editor to emit any debounced edit right away. Sent
			 * before a save so keystrokes made within the debounce window are
			 * not written to disk a revision late.
			 */
			type: 'flush';
			requestId: number;
	  };

/** Sent by the webview to the extension host. */
export type WebviewMessage =
	| {
			/** The webview is listening; the host answers with `init`. */
			type: 'ready';
	  }
	| {
			/** The user edited the document in the visual editor. */
			type: 'change';
			text: string;
	  }
	| {
			/**
			 * Answers a `flush`. Any `change` it produced is posted first, so
			 * by the time this arrives the host has the latest text.
			 */
			type: 'flush:done';
			requestId: number;
	  };
