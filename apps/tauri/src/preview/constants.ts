// Label of the slide preview window, as `open_preview` creates it.
export const PREVIEW_WINDOW = 'preview';

// Sent by the preview window once it listens, to ask for the document.
export const PREVIEW_READY_EVENT = 'preview-ready';

// Sent to the preview window with a `PreviewPayload` for the active document.
export const PREVIEW_DOCUMENT_EVENT = 'preview-document';

// What the preview window shows: the active document's slides, or a notice
// when it is not a Marp slide deck. The main window translates the notice,
// since the preview window loads no translations.
export type PreviewPayload =
	{ markdown: string; documentPath?: string } | { notice: string };
