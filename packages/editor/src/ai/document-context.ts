/**
 * External dependencies
 */
import { applyPatch, structuredPatch } from 'diff';

/**
 * Internal dependencies
 */
import { SELECTION_END, type EditContext } from './edit-target';

/**
 * How many unchanged lines are shown around each change.
 */
const CONTEXT_LINES = 8;

/**
 * Above this many characters, the changed lines are not sent, and the
 * whole document is sent again instead.
 */
export const MAX_CHANGES_LENGTH = 16384;

/**
 * Prefixes each line with its line number and a tab.
 *
 * @param lines     The lines.
 * @param firstLine The number of the first line.
 * @return The numbered lines.
 */
function numberLines( lines: string[], firstLine: number ): string {
	return lines
		.map( ( line, index ) => `${ firstLine + index }\t${ line }` )
		.join( '\n' );
}

/**
 * Splits a document into lines, without the empty line after the last line
 * break.
 *
 * @param document The document.
 * @return The lines.
 */
function toLines( document: string ): string[] {
	return document === '' ? [] : document.replace( /\n$/, '' ).split( '\n' );
}

/**
 * Shows the document as the model reads it: each line with its number.
 *
 * @param document The document.
 * @return The `<document>` block.
 */
export function formatDocument( document: string ): string {
	return [
		'<document>',
		numberLines( toLines( document ), 1 ),
		'</document>',
	]
		.filter( ( part ) => part !== '' )
		.join( '\n' );
}

/**
 * How long finding the changes may take, in milliseconds. Comparing two
 * very different versions of a long document takes long, and then the
 * whole document is sent instead.
 */
const DIFF_TIMEOUT = 100;

/**
 * Compares two versions of the document line by line.
 *
 * @param before The old version.
 * @param after  The new version.
 * @return The changes, or `undefined` when comparing takes too long.
 */
function diffLines( before: string, after: string ) {
	return structuredPatch( '', '', before, after, '', '', {
		context: CONTEXT_LINES,
		timeout: DIFF_TIMEOUT,
	} );
}

/**
 * Finds the lines that changed between two versions of the document. Each
 * change is shown as its lines after the change, with the unchanged lines
 * around it, numbered as in the new version. Where lines were removed, a
 * line without a number says how many.
 *
 * @param before The document the model saw last.
 * @param after  The document now.
 * @return The changed lines, an empty string when nothing changed, or
 *         `null` when comparing the versions takes too long.
 */
export function formatChangedLines(
	before: string,
	after: string
): string | null {
	if ( before === after ) {
		return '';
	}
	const patch = diffLines( before, after );
	if ( ! patch ) {
		return null;
	}
	return patch.hunks
		.map( ( hunk ) => {
			const lines: string[] = [];
			let number = hunk.newStart;
			let removed = 0;
			const flushRemoved = () => {
				if ( removed ) {
					lines.push(
						`[${ removed } ${
							removed === 1 ? 'line' : 'lines'
						} removed]`
					);
					removed = 0;
				}
			};
			hunk.lines.forEach( ( line ) => {
				if ( line.startsWith( '\\' ) ) {
					return;
				}
				if ( line.startsWith( '-' ) ) {
					removed++;
					return;
				}
				flushRemoved();
				lines.push( `${ number }\t${ line.slice( 1 ) }` );
				number++;
			} );
			flushRemoved();
			return lines.join( '\n' );
		} )
		.join( '\n...\n' );
}

/**
 * Applies to the document as the model knows it a change made to the
 * document in the editor, such as the model's edit. The editor's document
 * may hold changes the model has not been told about, which stay out.
 *
 * @param seen   The document as the model knows it.
 * @param before The editor's document before the change.
 * @param after  The editor's document after the change.
 * @return The document as the model knows it, with the change, or `null`
 *         when the change does not fit it.
 */
export function applyChange(
	seen: string,
	before: string,
	after: string
): string | null {
	if ( seen === before ) {
		return after;
	}
	const patch = diffLines( before, after );
	if ( ! patch ) {
		return null;
	}
	const result = applyPatch( seen, patch );
	return result === false ? null : result;
}

/**
 * Describes the selection, or where new content goes when nothing is
 * selected, with its line numbers in the document.
 *
 * @param context The selection and the document.
 * @return The `<selection>` block.
 */
export function formatSelection( context: EditContext ): string {
	const { document, selection, selectionStart, selectionEnd } = context;
	const lineAt = ( offset: number ) =>
		document.slice( 0, offset ).split( '\n' ).length;
	if ( selectionStart === selectionEnd ) {
		const afterLine = lineAt( selectionStart ) - 1;
		return `<selection after-line="${ afterLine }"></selection>`;
	}
	// A selection that ends with a line break ends on the line before it.
	const endLine = lineAt(
		document[ selectionEnd - 1 ] === '\n' ? selectionEnd - 1 : selectionEnd
	);
	return [
		`<selection lines="${ lineAt( selectionStart ) }-${ endLine }">`,
		selection.replace( /\n+$/, '' ),
		SELECTION_END,
	].join( '\n' );
}

/**
 * Builds what goes before the user's message to tell the model about the
 * document: the whole document in the first message, and after that the
 * lines the user changed since the model's last answer. When those are
 * many, or the model has not seen the document in this form, the whole
 * document is sent again. The selection comes last.
 *
 * @param context  The selection and the document now.
 * @param previous The document as it was when the model's last answer
 *                 ended, or `null` when the model has not seen it.
 * @return The context for the message.
 */
export function buildMessageContext(
	context: EditContext,
	previous: string | null
): string {
	const parts: string[] = [];
	const { document } = context;
	const changes =
		previous === null ? null : formatChangedLines( previous, document );
	if ( previous === null ) {
		parts.push( formatDocument( document ) );
	} else if (
		changes === null ||
		changes.length > MAX_CHANGES_LENGTH ||
		changes.length > document.length
	) {
		parts.push(
			'The document changed a lot after your last answer. This is the whole document now.',
			formatDocument( document )
		);
	} else if ( changes ) {
		const lineCount = toLines( document ).length;
		parts.push(
			[
				'<document_changes>',
				`The user changed the document after your last answer. These are the changed lines, with the lines around them, numbered as in the document now, which has ${ lineCount } ${
					lineCount === 1 ? 'line' : 'lines'
				}:`,
				changes,
				'</document_changes>',
			].join( '\n' )
		);
	}
	parts.push( formatSelection( context ) );
	return parts.join( '\n\n' );
}
