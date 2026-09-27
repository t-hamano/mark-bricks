/**
 * Internal dependencies
 */
import type { Settings, WritableSettingKey } from './settings';

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
