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
	  };
