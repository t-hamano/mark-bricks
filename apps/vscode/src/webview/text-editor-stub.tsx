// Build-time replacement for `@mark-bricks/editor`'s `components/text-editor`,
// swapped in by the `stubTextEditor` plugin in `vite.config.ts` to keep
// Monaco out of the bundle.
export function TextEditor() {
	return null;
}
