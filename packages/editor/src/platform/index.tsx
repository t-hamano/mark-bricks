/**
 * External dependencies
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Platform integration points that depend on the host environment
 * (Tauri, VS Code, …). The editor stays environment-agnostic and only
 * calls these callbacks; each host app injects its own implementation.
 */
export type Platform = {
	/**
	 * Opens a native image file picker and resolves with the path to
	 * store in the block, or `null` when the user cancels.
	 */
	pickImageFile?: () => Promise< string | null >;
	/**
	 * Converts a stored path into a URL the current webview can render
	 * in an `<img>` tag. Async because some hosts (e.g. VS Code) must
	 * round-trip to the extension process to resolve it.
	 */
	resolveImageSrc: ( path: string ) => Promise< string >;
	/**
	 * Resolves with a notice when the host cannot display the image at
	 * this path, or `null` when it can. Omitted when any path works.
	 */
	getImageNotice?: ( path: string ) => Promise< string | null >;
};

const defaultPlatform: Platform = {
	resolveImageSrc: async ( path ) => path,
};

const PlatformContext = createContext< Platform >( defaultPlatform );

type Props = {
	platform?: Partial< Platform >;
	children: ReactNode;
};

export function PlatformProvider( { platform, children }: Props ) {
	const value = useMemo< Platform >(
		() => ( { ...defaultPlatform, ...platform } ),
		[ platform ]
	);
	return (
		<PlatformContext.Provider value={ value }>
			{ children }
		</PlatformContext.Provider>
	);
}

export function usePlatform() {
	return useContext( PlatformContext );
}

/**
 * Returns the host's notice for an image path it cannot display, or `null`.
 *
 * @param path Image path or URL as entered.
 */
export function useImageNotice( path: string ): string | null {
	const { getImageNotice } = usePlatform();
	const [ notice, setNotice ] = useState< string | null >( null );

	useEffect( () => {
		const target = path.trim();
		if ( ! getImageNotice || ! target ) {
			setNotice( null );
			return;
		}

		let cancelled = false;
		getImageNotice( target ).then( ( nextNotice ) => {
			if ( ! cancelled ) {
				setNotice( nextNotice );
			}
		} );
		return () => {
			cancelled = true;
		};
	}, [ path, getImageNotice ] );

	return notice;
}
