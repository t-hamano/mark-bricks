/**
 * External dependencies
 */
import { useEffect, useState, useSyncExternalStore } from 'react';

export function useMediaQuery( query: string ): boolean {
	return useSyncExternalStore(
		( onChange ) => {
			const mediaQueryList = window.matchMedia( query );
			mediaQueryList.addEventListener( 'change', onChange );
			return () =>
				mediaQueryList.removeEventListener( 'change', onChange );
		},
		() => window.matchMedia( query ).matches
	);
}

/**
 * Creates an invisible element whose background is the `Canvas` system color,
 * i.e. the page background of the active forced-colors palette.
 */
function createCanvasProbe(): HTMLDivElement {
	const probe = document.createElement( 'div' );
	probe.style.cssText =
		'position:fixed;width:0;height:0;visibility:hidden;pointer-events:none';
	probe.style.backgroundColor = 'Canvas';
	document.body.appendChild( probe );
	return probe;
}

function isCanvasProbeDark( probe: HTMLElement ): boolean {
	const channels = getComputedStyle( probe )
		.backgroundColor.match( /\d+/g )
		?.map( Number );
	if ( ! channels || channels.length < 3 ) {
		return false;
	}
	const [ r, g, b ] = channels;
	// Approximate perceived brightness (0–255). Green is weighted highest and
	// blue lowest because the human eye is most sensitive to green. Anything
	// darker than the midpoint (128) is treated as a dark background.
	return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

/**
 * Whether the active forced-colors palette has a dark background.
 *
 * `prefers-color-scheme` can't be trusted under forced colors: on Windows,
 * Tauri reports a light theme whenever a contrast theme is active, so the
 * resolved `Canvas` system color is inspected instead.
 *
 * @param forcedColors Whether `forced-colors` is active.
 */
function useForcedCanvasDark( forcedColors: boolean ): boolean {
	const [ isDark, setIsDark ] = useState( () => {
		if ( ! forcedColors ) {
			return false;
		}
		const probe = createCanvasProbe();
		const result = isCanvasProbeDark( probe );
		probe.remove();
		return result;
	} );

	// Switching between contrast themes keeps `forced-colors` active, so no
	// media query change fires. Instead, give the probe a tiny transition: when
	// the palette changes, its background color changes and `transitionend`
	// tells us to re-check.
	useEffect( () => {
		if ( ! forcedColors ) {
			return;
		}
		const probe = createCanvasProbe();
		probe.style.setProperty(
			'transition',
			'background-color 1ms',
			'important'
		);
		const update = () => setIsDark( isCanvasProbeDark( probe ) );
		update();
		probe.addEventListener( 'transitionend', update );
		return () => probe.remove();
	}, [ forcedColors ] );

	return isDark;
}

/**
 * Whether the OS prefers a dark appearance, including dark contrast themes.
 */
export function useSystemDark(): boolean {
	const prefersDark = useMediaQuery( '(prefers-color-scheme: dark)' );
	const forcedColors = useMediaQuery( '(forced-colors: active)' );
	const forcedCanvasDark = useForcedCanvasDark( forcedColors );

	return forcedColors ? forcedCanvasDark : prefersDark;
}
