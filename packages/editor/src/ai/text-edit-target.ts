/**
 * Internal dependencies
 */
import { SELECTION_END, SELECTION_START, type EditTarget } from './edit-target';
import { joinFrontMatter, splitFrontMatter } from '../converter';
import type { AiEdit } from '../platform';
import { findUniqueText } from './find-text';
import { splitAiFrontMatter } from './front-matter';

/**
 * A range of the text editor's content, as character offsets.
 */
export type TextRange = {
	start: number;
	end: number;
};

/**
 * The parts of the text editor the target reads and changes.
 * `getTextEditorAccess` provides them for Monaco.
 */
export type TextEditorAccess = {
	getValue: () => string;
	getSelection: () => TextRange;
	/**
	 * Follows `range` through later edits. The returned function gives its
	 * current position, or `null` when the range or the editor is gone.
	 */
	trackRange: ( range: TextRange ) => () => TextRange | null;
	/**
	 * Replaces `range` with `text` as one undo step.
	 */
	replaceRange: ( range: TextRange, text: string ) => void;
};

/**
 * Widens an empty selection to the line it is on.
 *
 * @param value     The editor's content.
 * @param selection The selection.
 * @return The range to edit.
 */
function getEditRange( value: string, selection: TextRange ): TextRange {
	if ( selection.start !== selection.end ) {
		return selection;
	}
	const start = value.lastIndexOf( '\n', selection.start - 1 ) + 1;
	const lineEnd = value.indexOf( '\n', selection.start );
	return { start, end: lineEnd === -1 ? value.length : lineEnd };
}

type SelectionAction = 'replace' | 'insert_after';

type Replacement = {
	range: TextRange;
	text: string;
};

/**
 * Works out how to replace the selection with `markdown`, or to insert it
 * after the selection's last line.
 *
 * @param text     The editor's content.
 * @param current  The selection's current range.
 * @param action   How to apply the Markdown.
 * @param markdown Markdown to apply.
 * @return The replacement to make.
 */
function getReplacement(
	text: string,
	current: TextRange,
	action: SelectionAction,
	markdown: string
): Replacement {
	const content = markdown.replace( /\n+$/, '' );

	if ( action === 'replace' ) {
		// Keep the line break that ended the selection, if any.
		const selected = text.slice( current.start, current.end );
		const lineBreak = /\n+$/.exec( selected )?.[ 0 ] ?? '';
		return { range: current, text: content + lineBreak };
	}

	// Insert after the selection's last line, separated from it, and from
	// what follows, by a blank line.
	const lastLineEnd =
		current.end > current.start && text[ current.end - 1 ] === '\n'
			? current.end - 1
			: text.indexOf( '\n', current.end );
	const at = lastLineEnd === -1 ? text.length : lastLineEnd;
	const rest = text.slice( at );
	const needsBlankLineAfter =
		rest !== '' && rest !== '\n' && ! rest.startsWith( '\n\n' );
	return {
		range: { start: at, end: at },
		text: '\n\n' + content + ( needsBlankLineAfter ? '\n' : '' ),
	};
}

function applyReplacement(
	text: string,
	{ range, text: inserted }: Replacement
) {
	return text.slice( 0, range.start ) + inserted + text.slice( range.end );
}

/**
 * The smallest replacement that turns `before` into `after`.
 *
 * @param before Text now.
 * @param after  Text wanted.
 * @return The replacement.
 */
function diff( before: string, after: string ): Replacement {
	let start = 0;
	const max = Math.min( before.length, after.length );
	while ( start < max && before[ start ] === after[ start ] ) {
		start++;
	}
	let end = 0;
	while (
		end < max - start &&
		before[ before.length - 1 - end ] === after[ after.length - 1 - end ]
	) {
		end++;
	}
	return {
		range: { start, end: before.length - end },
		text: after.slice( start, after.length - end ),
	};
}

/**
 * Applies the model's front matter and body to the document: the front
 * matter replaces the document's own, and the body goes to the selection.
 *
 * @param text        The editor's content.
 * @param current     The selection's current range.
 * @param action      How to apply the body.
 * @param frontMatter The model's front matter.
 * @param body        The model's Markdown after the front matter.
 * @return The new content.
 */
function applyWithFrontMatter(
	text: string,
	current: TextRange,
	action: SelectionAction,
	frontMatter: string,
	body: string
): string {
	const headerLength = text.length - splitFrontMatter( text ).body.length;
	let rest = text.slice( headerLength );
	if ( body.trim() !== '' && current.end <= headerLength ) {
		// The selection is all inside the old front matter: the body goes
		// first, separated from what follows by a blank line.
		const after = rest.replace( /^\n+/, '' );
		rest = body.replace( /\n+$/, '' ) + ( after ? '\n\n' + after : '\n' );
	} else if ( body.trim() !== '' ) {
		// The part of the selection inside the old front matter goes with
		// it.
		const range = {
			start: Math.max( current.start - headerLength, 0 ),
			end: Math.max( current.end - headerLength, 0 ),
		};
		rest = applyReplacement(
			rest,
			getReplacement( rest, range, action, body )
		);
	}
	return joinFrontMatter( frontMatter, rest.replace( /^\n+/, '' ) );
}

/**
 * Creates the edit target for the text editor, from the selection now. With
 * no selection, the target is the line the cursor is on. A `replace_text`
 * edit changes the text it names instead, wherever it is.
 *
 * @param access Text editor access.
 * @return The edit target.
 */
export function createTextEditTarget( access: TextEditorAccess ): EditTarget {
	const value = access.getValue();
	const range = getEditRange( value, access.getSelection() );
	const getRange = access.trackRange( range );

	return {
		getContext() {
			return {
				selection: value.slice( range.start, range.end ),
				document:
					value.slice( 0, range.start ) +
					SELECTION_START +
					value.slice( range.start, range.end ) +
					SELECTION_END +
					value.slice( range.end ),
			};
		},

		apply( edit: AiEdit ) {
			if ( edit.action === 'replace_text' ) {
				// The front matter is part of the text, so it needs no
				// special handling.
				const found = findUniqueText( access.getValue(), edit.find );
				if ( 'reason' in found ) {
					return { status: 'failed', reason: found.reason };
				}
				access.replaceRange( found, edit.markdown );
				return { status: 'applied' };
			}
			const { action, markdown } = edit;
			const current = getRange();
			if ( ! current ) {
				return { status: 'dropped' };
			}
			const text = access.getValue();
			const { frontMatter, body } = splitAiFrontMatter( markdown );
			const replacement =
				frontMatter === null
					? getReplacement( text, current, action, markdown )
					: diff(
							text,
							applyWithFrontMatter(
								text,
								current,
								action,
								frontMatter,
								body
							)
						);
			access.replaceRange( replacement.range, replacement.text );
			return { status: 'applied' };
		},
	};
}
