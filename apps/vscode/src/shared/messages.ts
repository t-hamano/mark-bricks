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

// Sent to the slide preview: the document's slides, or a notice when the
// document is not a Marp slide deck. The host translates the notice, since
// the preview loads no translations.
export type PreviewHostMessage =
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
