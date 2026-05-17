/**
 * External dependencies
 */
import type { AlignType, Table, TableRow, TableCell } from 'mdast';

/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import {
	contentToInline,
	createBlock,
	inlineToContent,
	richTextToString,
} from '../utils';
import type { NodeResult } from '../types';
import type { BlockAttributes, Cell, Row } from './types';

/**
 * Converts an mdast Table node into a `core/table` block.
 *
 * GFM stores column alignment once on the delimiter row; `core/table` stores
 * it per cell, so the alignment is copied onto every cell of the column.
 * Markdown tables have no footer, so `foot` is left empty.
 *
 * ```md
 * | Left | Center | Right |
 * | :--- | :----: | ----: |
 * | a    | b      | c     |
 * ```
 *
 * @param node mdast Table node from remark-parse + remark-gfm.
 * @return `core/table` block.
 */
export function toBlock( node: Table ): Block {
	const align = node.align ?? [];
	const [ headerRow, ...bodyRows ] = node.children;

	const toCells = ( row: TableRow, tag: 'td' | 'th' ): Cell[] =>
		row.children.map( ( cell, column ): Cell => {
			const result: Cell = {
				content: inlineToContent( cell.children ),
				tag,
			};
			const columnAlign = align[ column ];
			if ( columnAlign ) {
				result.align = columnAlign;
			}
			return result;
		} );

	return createBlock( 'core/table', {
		head: headerRow ? [ { cells: toCells( headerRow, 'th' ) } ] : [],
		body: bodyRows.map( ( row ) => ( { cells: toCells( row, 'td' ) } ) ),
		foot: [],
	} );
}

/**
 * Converts a `core/table` block back into an mdast Table node.
 *
 * GFM cannot represent every `core/table` feature, so structure is normalized:
 * `foot` rows are appended to the body, only the first `head` row stays a
 * header (extra rows move into the body), and an empty `head` yields a blank
 * synthesized header row. Column alignment is taken from the header cells.
 *
 * @param block `core/table` block.
 * @return mdast Table node.
 */
export function toNode( block: Block ): NodeResult< Table > {
	const { head, body, foot } = block.attributes as BlockAttributes;

	const [ headerRow, ...extraHeadRows ] = head;
	const bodyRows: Row[] = [ ...extraHeadRows, ...body, ...foot ];
	const headerCells: Cell[] = headerRow?.cells ?? [];

	const columnCount = [
		headerCells,
		...bodyRows.map( ( r ) => r.cells ),
	].reduce( ( max, cells ) => Math.max( max, cells.length ), 0 );

	const toMdastRow = ( cells: Cell[] ): TableRow => {
		const filled: Cell[] = [ ...cells ];
		while ( filled.length < columnCount ) {
			filled.push( { content: '', tag: 'td' } );
		}
		return {
			type: 'tableRow',
			children: filled.map(
				( cell ): TableCell => ( {
					type: 'tableCell',
					children: contentToInline(
						richTextToString( cell.content )
					),
				} )
			),
		};
	};

	const align: AlignType[] = Array.from(
		{ length: columnCount },
		( _value, column ) => headerCells[ column ]?.align ?? null
	);

	return {
		node: {
			type: 'table',
			align,
			children: [
				toMdastRow( headerCells ),
				...bodyRows.map( ( row ) => toMdastRow( row.cells ) ),
			],
		},
	};
}
