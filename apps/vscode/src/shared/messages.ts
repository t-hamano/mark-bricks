/**
 * Internal dependencies
 */
import type { Settings, WritableSettingKey } from './settings';

// What `inspectCodePreviews` from `@mark-bricks/editor` reports. Repeated
// here because the extension is built without the DOM types it uses.
export type CodePreviewReport = {
	previews: Array< { language: string; status: string } >;
	katexFonts: Array< { family: string; status: string } >;
};

// Why the webview cannot display an image.
export type ImageError = 'insecureUrl' | 'outsideRoots';

export type HostMessage =
	| {
			type: 'init';
			text: string;
			settings: Settings;
	  }
	| {
			type: 'update';
			text: string;
	  }
	| {
			type: 'settings';
			settings: Settings;
	  }
	| {
			type: 'flush';
			requestId: number;
	  }
	| {
			type: 'resolveImage:done';
			requestId: number;
			src: string;
	  }
	| {
			type: 'pickImage:done';
			requestId: number;
			path: string | null;
	  }
	| {
			type: 'checkImage:done';
			requestId: number;
			error: ImageError | null;
	  };

export type WebviewMessage =
	| {
			type: 'ready';
	  }
	| {
			type: 'rendered';
	  }
	| {
			type: 'codePreviews';
			report: CodePreviewReport;
	  }
	| {
			type: 'change';
			text: string;
	  }
	| {
			type: 'openSettings';
	  }
	| {
			type: 'openMarpPreview';
	  }
	| {
			type: 'updateSetting';
			key: WritableSettingKey;
			value: boolean;
	  }
	| {
			type: 'flush:done';
			requestId: number;
	  }
	| {
			type: 'resolveImage';
			requestId: number;
			path: string;
	  }
	| {
			type: 'pickImage';
			requestId: number;
	  }
	| {
			type: 'checkImage';
			requestId: number;
			path: string;
	  };

// What the slide preview's webview saves with `setState`, for the host to
// restore its panel after a restart.
export type PreviewState = {
	uri: string;
};

// Text of the slide preview's controls. Repeated from `PreviewLabels` in
// `@mark-bricks/marp-preview/controls`, since the extension is built without
// the DOM types it uses.
export type PreviewLabels = {
	enterSlideMode: string;
	exitSlideMode: string;
	exitSlideModeHint: string;
	previousSlide: string;
	nextSlide: string;
	slideNumber: string;
};

// Sent to the slide preview: the document it shows with the text of its
// controls, then the document's slides, or a notice when the document is not
// a Marp slide deck. The host translates the text, since the preview loads no
// translations.
export type PreviewHostMessage =
	| {
			type: 'document';
			uri: string;
			labels: PreviewLabels;
	  }
	| {
			type: 'slides';
			html: string;
			css: string;
	  }
	| {
			type: 'notice';
			text: string;
	  };

export type PreviewWebviewMessage =
	| {
			type: 'ready';
	  }
	| {
			type: 'rendered';
			slideCount: number;
	  };
