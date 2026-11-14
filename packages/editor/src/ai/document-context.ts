/**
 * External dependencies
 */
import { structuredPatch } from 'diff';

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
 * Finds the lines that changed between two versions of the document. Each
 * change is shown as its lines after the change, with the unchanged lines
 * around it, numbered as in the new version. Removed lines are not shown.
 *
 * @param before The document the model saw last.
 * @param after  The document now.
 * @return The changed lines, or an empty string when nothing changed.
 */
export function formatChangedLines( before: string, after: string ): string {
	if ( before === after ) {
		return '';
	}
	const patch = structuredPatch( '', '', before, after, '', '', {
		context: CONTEXT_LINES,
	} );
	return patch.hunks
		.map( ( hunk ) =>
			numberLines(
				hunk.lines
					.filter(
						( line ) =>
							! line.startsWith( '-' ) &&
							! line.startsWith( '\\' )
					)
					.map( ( line ) => line.slice( 1 ) ),
				hunk.newStart
			)
		)
		.join( '\n...\n' );
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
	const changes =
		previous === null
			? null
			: formatChangedLines( previous, context.document );
	if ( changes === null ) {
		parts.push( formatDocument( context.document ) );
	} else if (
		changes.length > MAX_CHANGES_LENGTH ||
		changes.length > context.document.length
	) {
		parts.push(
			'The document changed a lot after your last answer. This is the whole document now.',
			formatDocument( context.document )
		);
	} else if ( changes ) {
		parts.push(
			[
				'<document_changes>',
				'The user changed the document after your last answer. These are the changed lines, with the lines around them, numbered as in the document now:',
				changes,
				'</document_changes>',
			].join( '\n' )
		);
	}
	parts.push( formatSelection( context ) );
	return parts.join( '\n\n' );
}
