// Injected by VSCode; callable once per page load.
declare function acquireVsCodeApi(): {
	postMessage: ( message: unknown ) => void;
	getState: () => unknown;
	setState: < T >( state: T ) => T;
};
