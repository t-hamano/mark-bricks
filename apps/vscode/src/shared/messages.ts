/**
 * Internal dependencies
 */
import type { Settings, WritableSettingKey } from './settings';

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
	  };

export type WebviewMessage =
	| {
			type: 'ready';
	  }
	| {
			type: 'change';
			text: string;
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
	  };
