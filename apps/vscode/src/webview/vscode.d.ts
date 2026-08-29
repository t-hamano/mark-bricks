/**
 * Injected into every webview by VSCode. Callable exactly once per page load,
 * which is why the result is held in a module-level constant.
 */
declare function acquireVsCodeApi(): {
	postMessage: ( message: unknown ) => void;
	getState: () => unknown;
	setState: < T >( state: T ) => T;
};
