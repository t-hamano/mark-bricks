/**
 * Build-time replacement for `@mark-bricks/editor`'s `components/text-editor`,
 * wired up by the `stubTextEditor` plugin in `vite.config.ts`.
 *
 * Raw Markdown is edited in VSCode's own text editor, so the bundled Monaco
 * source editor is never rendered here. Lazy loading alone does not keep it
 * out of the build — the dynamic `import()` in `components/editor` still makes
 * Rollup emit its ~4 MB of chunks — so the module is swapped for this stub.
 */
export function TextEditor() {
	return null;
}
