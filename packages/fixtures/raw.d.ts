/**
 * Type for Vite's `?raw` import suffix, which loads a file as a string.
 */
declare module '*.md?raw' {
	const content: string;
	export default content;
}
