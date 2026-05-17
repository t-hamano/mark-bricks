/**
 * External dependencies
 */
import { createContext, useContext, useMemo } from 'react';
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
	pickImageFile: () => Promise< string | null >;
	/**
	 * Converts a stored path into a URL the current webview can render
	 * in an `<img>` tag. Async because some hosts (e.g. VS Code) must
	 * round-trip to the extension process to resolve it.
	 */
	resolveImageSrc: ( path: string ) => Promise< string >;
};

const defaultPlatform: Platform = {
	pickImageFile: async () => null,
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
