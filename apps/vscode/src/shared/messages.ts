// The protocol between the extension host and the webview. Both sides import
// this module, so neither can change a message shape without the other
// failing to type-check.

/** Sent by the extension host to the webview. */
export type HostMessage =
	| {
			type: 'init';
			text: string;
	  }
	| {
			type: 'update';
			text: string;
	  }
	| {
			// Asks the editor to flush any debounced edit before a save, so
			// keystrokes within the debounce window aren't written a revision late.
			type: 'flush';
			requestId: number;
	  };

/** Sent by the webview to the extension host. */
export type WebviewMessage =
	| {
			type: 'ready';
	  }
	| {
			type: 'change';
			text: string;
	  }
	| {
			// The `change` this produces is posted first, so by the time this
			// answer arrives the host already has the latest text.
			type: 'flush:done';
			requestId: number;
	  };
