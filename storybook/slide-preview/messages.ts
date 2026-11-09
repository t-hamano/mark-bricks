// The id of the story that shows the slide preview in a frame.
export const SLIDE_PREVIEW_STORY_ID = 'internal-slide-preview-frame--default';

export type SlidePreviewMessage =
	{ type: 'ready' } | { type: 'markdown'; markdown: string };

export const SLIDE_PREVIEW_READY: SlidePreviewMessage = { type: 'ready' };
