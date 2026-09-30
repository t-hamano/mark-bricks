/**
 * Internal dependencies
 */
import { MATH_LANGUAGE } from '../hooks/code-languages';
import type { CodeFormat } from './types';

/**
 * Tells whether a code block language names a math block. The language is
 * compared as the edit component does: ignoring case and surrounding spaces.
 *
 * @param language Code block language.
 * @return Whether the block is a math block.
 */
export function isMathLanguage( language: string | undefined ): boolean {
	return language?.trim().toLowerCase() === MATH_LANGUAGE;
}

/**
 * Returns the format a code block takes when its language changes.
 *
 * A block that becomes a math block is written as `$$`, the syntax the most
 * Markdown tools render, Marp among them. A math block read from the file
 * keeps its fence until its language is changed, so a document is not
 * rewritten without an edit. A `$$` block that stops being math returns to a
 * backtick fence, since `$$` holds nothing but math.
 *
 * @param format           Current format of the block.
 * @param previousLanguage Language before the change.
 * @param nextLanguage     Language after the change.
 * @return The format of the block after the change.
 */
export function formatForLanguage(
	format: CodeFormat,
	previousLanguage: string | undefined,
	nextLanguage: string | undefined
): CodeFormat {
	const isMath = isMathLanguage( nextLanguage );
	if ( isMath && ! isMathLanguage( previousLanguage ) ) {
		return 'dollar';
	}
	if ( ! isMath && format === 'dollar' ) {
		return 'fenced-backtick';
	}
	return format;
}
