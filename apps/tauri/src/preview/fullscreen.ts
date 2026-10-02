/**
 * External dependencies
 */
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { SlideMode } from '@mark-bricks/marp-preview/browser';

/**
 * Lets the `F` and F11 keys toggle full screen, and Escape leave it. Full
 * screen presents the slides in the slide mode.
 *
 * @param slideMode The slide mode of the preview.
 * @param onChange  Called when full screen starts or ends.
 * @return `toggle` to toggle full screen.
 */
export function setupFullscreen(
	slideMode: SlideMode,
	onChange: ( fullscreen: boolean ) => void
): { toggle: () => void } {
	const appWindow = getCurrentWebviewWindow();

	function update( value: boolean ) {
		if ( value === slideMode.isEnabled() ) {
			return;
		}
		slideMode.setEnabled( value );
		onChange( value );
	}

	async function syncWithWindow() {
		update( await appWindow.isFullscreen() );
	}

	function setFullscreen( value: boolean ) {
		// Switches the view right away, rather than once the window resizes.
		update( value );
		appWindow.setFullscreen( value ).catch( syncWithWindow );
	}

	function toggle() {
		setFullscreen( ! slideMode.isEnabled() );
	}

	window.addEventListener( 'keydown', ( event ) => {
		if ( event.ctrlKey || event.metaKey || event.altKey || event.repeat ) {
			return;
		}
		if ( event.key.toLowerCase() === 'f' || event.key === 'F11' ) {
			event.preventDefault();
			toggle();
		} else if ( event.key === 'Escape' && slideMode.isEnabled() ) {
			event.preventDefault();
			setFullscreen( false );
		}
	} );

	// Full screen can also end without the `F` key, such as with the green
	// button on macOS.
	void appWindow.onResized( () => void syncWithWindow() );

	return { toggle };
}
