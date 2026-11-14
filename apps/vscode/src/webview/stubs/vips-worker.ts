/**
 * Stands in for `@wordpress/vips/worker`, the WebAssembly image processing
 * that the block editor loads only when client-side media processing is
 * turned on. The extension never turns it on, so this keeps the 13 MB worker out of
 * the build. Each function fails as the real one would without the worker.
 */

const unavailable = () =>
	Promise.reject(
		new Error( 'Client-side media processing is not available.' )
	);

export const vipsConvertImageFormat = unavailable;
export const vipsCompressImage = unavailable;
export const vipsResizeImage = unavailable;
export const vipsRotateImage = unavailable;
export const vipsHasTransparency = unavailable;
export const vipsGetUltraHdrInfo = unavailable;
export const vipsCancelOperations = () => Promise.resolve( false );
export const terminateVipsWorker = () => {};
