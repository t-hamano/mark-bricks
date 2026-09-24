export type HostMessage =
	| {
			type: 'init';
			text: string;
	  }
	| {
			type: 'update';
			text: string;
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
			type: 'flush:done';
			requestId: number;
	  }
	| {
			type: 'resolveImage';
			requestId: number;
			path: string;
	  };
