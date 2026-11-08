/**
 * External dependencies
 */
import type { RenderedSlides } from '@mark-bricks/marp-preview/render';

// Path of the slide preview page, which the main window shows in a frame
// next to the editor.
export const PREVIEW_PAGE = '/pages/preview.html';

// Sent by the main window to the preview frame.
export type PreviewCommand =
	// The active document's slides, rendered by the main window.
	| { type: 'slides'; slides: RenderedSlides }
	// The line of the selected block, for the preview to highlight its
	// element and move to its slide.
	| { type: 'selected-line'; line: number | null }
	// Turns the slide mode on or off, once the frame fills the window.
	| { type: 'slide-mode'; enabled: boolean };

// Sent by the preview frame to the main window.
export type PreviewEvent =
	// The frame listens, and asks for the document.
	| { type: 'ready' }
	// The user clicked an element of a slide, for the editor to select its
	// block.
	| { type: 'line-click'; line: number }
	// The user asked to turn the slide mode on or off.
	| { type: 'slide-mode-request'; enabled: boolean };
