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
 * An edit the AI assistant makes to the document.
 */
export type AiEdit =
	| {
			/**
			 * `replace` replaces the selection it was given, and
			 * `insert_after` inserts the Markdown after it.
			 */
			action: 'replace' | 'insert_after';
			markdown: string;
	  }
	| {
			/**
			 * Replaces the one place in the document whose text is `find`
			 * with the Markdown, wherever the selection is.
			 */
			action: 'replace_text';
			find: string;
			markdown: string;
	  };

/**
 * What became of an edit: `applied` when it changed the document,
 * `dropped` when the selection it was for no longer exists, and `failed`
 * when the model can fix it and try again, for example when its `find`
 * text is not in the document. `reason` tells the model what went wrong.
 */
export type AiEditResult =
	| { status: 'applied' }
	| { status: 'dropped' }
	| { status: 'failed'; reason: string };

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
	 * The part of `inputTokens` the model read from the prompt cache, for
	 * a fraction of the price. Omitted when the host does not report it.
	 */
	cachedInputTokens?: number;
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
			 * The model edited the document.
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
	 * Called for each event while the model answers. For an `edit`, it
	 * applies the edit and returns what became of it, so the host can tell
	 * the model.
	 */
	onEvent: ( event: AiStreamEvent ) => AiEditResult | void;
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
