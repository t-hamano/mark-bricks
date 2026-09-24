/**
 * External dependencies
 */
import { createContext, useContext } from 'react';

export type FrontMatterContextValue = {
	// `null` when the document has none.
	frontMatter: string | null;
	// `''` adds, `null` removes.
	setFrontMatter: ( next: string | null ) => void;
};

export const FrontMatterContext = createContext< FrontMatterContextValue >( {
	frontMatter: null,
	setFrontMatter: () => {},
} );

/**
 * Reads and updates the document's YAML front matter.
 *
 * @return The current front matter and its setter.
 */
export function useFrontMatter(): FrontMatterContextValue {
	return useContext( FrontMatterContext );
}
