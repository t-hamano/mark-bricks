/**
 * External dependencies
 */
import type { RenderedSlides } from '@mark-bricks/marp-preview/render';
import type { PreviewPlacement } from '@mark-bricks/marp-preview/controls';

export type { PreviewPlacement };

// Path of the slide preview page, which the main window shows in a frame next
// to the editor, or in a window of its own, as `open_preview` creates it.
export const PREVIEW_PAGE = '/pages/preview.html';

// Label of the slide preview window.
export const PREVIEW_WINDOW = 'preview';

// The events that carry a `PreviewCommand` to the preview window and a
// `PreviewEvent` from it. The frame next to the editor uses `postMessage`.
export const PREVIEW_COMMAND_EVENT = 'preview-command';
export const PREVIEW_EVENT = 'preview-event';

// Sent by the native side when the user closes the preview window.
export const PREVIEW_WINDOW_CLOSED_EVENT = 'preview-window-closed';

// Sent by the main window to the preview.
export type PreviewCommand =
	// The active document's slides, rendered by the main window, or a notice
	// when it is not a Marp slide deck, which only the window shows.
	| { type: 'slides'; slides: RenderedSlides | { notice: string } }
	// The line of the selected block, for the preview to highlight its
	// element and move to its slide.
	| { type: 'selected-line'; line: number | null }
	// Turns the slide mode of the frame on or off, once the frame fills the
	// window.
	| { type: 'slide-mode'; enabled: boolean };

// Sent by the preview to the main window.
export type PreviewEvent =
	// The preview listens, and asks for the document.
	| { type: 'ready' }
	// The user clicked an element of a slide, for the editor to select its
	// block.
	| { type: 'line-click'; line: number }
	// The user asked the frame to turn the slide mode on or off. The window
	// handles its own.
	| { type: 'slide-mode-request'; enabled: boolean }
	// The user asked to move the preview to the other place.
	| { type: 'placement-request'; placement: PreviewPlacement };
