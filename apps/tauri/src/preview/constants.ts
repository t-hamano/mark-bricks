// Label of the slide preview window, as `open_preview` creates it.
export const PREVIEW_WINDOW = 'preview';

// Sent by the preview window once it listens, to ask for the document.
export const PREVIEW_READY_EVENT = 'preview-ready';

// Sent to the preview window with a `PreviewPayload` for the active document.
export const PREVIEW_DOCUMENT_EVENT = 'preview-document';

// What the preview window shows: the active document's slides, or a notice
// when it is not a Marp slide deck. The main window translates the notice.
export type PreviewPayload =
	{ markdown: string; documentPath?: string } | { notice: string };

// Sent to the preview window with a `PreviewLinePayload` whenever the line
// of the selected block changes, for the preview to move to its slide.
export const PREVIEW_SELECTED_LINE_EVENT = 'preview-selected-line';

// Sent by the preview window with a `PreviewLinePayload` when the user clicks
// a slide, for the editor to select the slide's first block.
export const PREVIEW_LINE_CLICK_EVENT = 'preview-line-click';

// A line of the active document, counted from 0, or `null` for none.
export type PreviewLinePayload = { line: number | null };
