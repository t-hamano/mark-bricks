// Sent by the export window once it listens, to ask for the deck.
export const EXPORT_READY_EVENT = 'export-ready';

// Sent to the export window with the `ExportDeck` to print.
export const EXPORT_DECK_EVENT = 'export-deck';

// Sent by the export window once the slides, their fonts and their images
// have loaded, with an `ExportRendered`.
export const EXPORT_RENDERED_EVENT = 'export-rendered';

export type ExportDeck = { markdown: string; documentPath?: string };

// The page size and the PDF's metadata, or why the deck did not render.
export type ExportRendered =
	| {
			width: number;
			height: number;
			title?: string;
			description?: string;
			author?: string;
			keywords?: string[];
	  }
	| { error: string };
