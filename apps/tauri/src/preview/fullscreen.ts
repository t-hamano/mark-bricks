/**
 * External dependencies
 */
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { SlidePreview } from '@mark-bricks/marp-preview/controls';

/**
 * Ties the slide mode to the window's full screen: the preview enters full
 * screen with it, and leaves it when full screen ends.
 *
 * @param preview The slide preview of the window.
 * @return `setFullscreen` to enter or leave full screen with the slide mode.
 */
export function setupFullscreen( preview: SlidePreview ): {
	setFullscreen: ( fullscreen: boolean ) => void;
} {
	const appWindow = getCurrentWebviewWindow();

	async function syncWithWindow() {
		preview.setSlideMode( await appWindow.isFullscreen() );
	}

	function setFullscreen( value: boolean ) {
		// Switches the view right away, rather than once the window resizes.
		preview.setSlideMode( value );
		appWindow.setFullscreen( value ).catch( syncWithWindow );
	}

	// Full screen can also end without the `F` key, such as with the green
	// button on macOS.
	void appWindow.onResized( () => void syncWithWindow() );

	return { setFullscreen };
}
