/**
 * Marp CLI, bundled into its own file (`dist/marp-cli.cjs`) that the
 * extension loads on the first PDF export, since it is several times the size
 * of the rest of the extension host's code.
 *
 * The same file is Marp CLI's functional engine: the export passes its path
 * to `--engine`, and Marp CLI takes the default export. Marp CLI then renders
 * with the Marp Core and options of the HTML export, and the file holds a
 * single copy of Marp Core.
 */
export { CLIError, CLIErrorCode, marpCli } from '@marp-team/marp-cli';
export { createExportMarp as default } from '@mark-bricks/marp-preview/export';
