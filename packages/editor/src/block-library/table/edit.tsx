/**
 * External dependencies
 */
import { useState, type FormEvent } from 'react';

/**
 * WordPress dependencies
 */
import {
	AlignmentControl,
	BlockControls,
	BlockIcon,
	RichText,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	Button,
	Placeholder,
	TextControl,
	ToolbarDropdownMenu,
	ToolbarGroup,
} from '@wordpress/components';
import { Stack } from '@wordpress/ui';
import { __ } from '@wordpress/i18n';
import {
	table as tableIcon,
	tableColumnAfter,
	tableColumnBefore,
	tableColumnDelete,
	tableRowAfter,
	tableRowBefore,
	tableRowDelete,
} from '@wordpress/icons';

/**
 * Internal dependencies
 */
import type { BlockEditProps } from '../types';
import type { BlockAttributes, Cell, Row } from './types';

type Alignment = 'left' | 'center' | 'right' | undefined;
type Section = 'head' | 'body' | 'foot';

type CellLocation = {
	section: Section;
	rowIndex: number;
	columnIndex: number;
};

const createCell = ( tag: 'td' | 'th', align?: Alignment ): Cell =>
	align ? { content: '', tag, align } : { content: '', tag };

const createEmptyRow = (
	columnCount: number,
	tag: 'td' | 'th',
	alignments: Alignment[] = []
): Row => ( {
	cells: Array.from( { length: columnCount }, ( _value, columnIndex ) =>
		createCell( tag, alignments[ columnIndex ] )
	),
} );

const createEmptyTable = (
	rowCount: number,
	columnCount: number
): Pick< BlockAttributes, 'head' | 'body' | 'foot' > => {
	const rows = Math.max( 1, rowCount );
	const columns = Math.max( 1, columnCount );
	return {
		head: [ createEmptyRow( columns, 'th' ) ],
		body: Array.from( { length: rows }, () =>
			createEmptyRow( columns, 'td' )
		),
		foot: [],
	};
};

const getColumnCount = ( head: Row[], body: Row[] ) => {
	const headColumns = head[ 0 ]?.cells.length ?? 0;
	const bodyColumns = body[ 0 ]?.cells.length ?? 0;
	return Math.max( headColumns, bodyColumns );
};

export default function Edit( props: BlockEditProps ) {
	const { attributes, setAttributes } =
		props as BlockEditProps< BlockAttributes >;
	const { head, body, foot } = attributes;
	const blockProps = useBlockProps();
	const [ initialRowCount, setInitialRowCount ] = useState( '2' );
	const [ initialColumnCount, setInitialColumnCount ] = useState( '2' );
	const [ selectedCell, setSelectedCell ] = useState< CellLocation | null >(
		null
	);

	const isEmpty = head.length === 0 && body.length === 0 && foot.length === 0;

	const sectionRows = ( section: Section ): Row[] => {
		if ( section === 'head' ) {
			return head;
		}
		if ( section === 'foot' ) {
			return foot;
		}
		return body;
	};

	// Reads the alignment of a column from the first cell that defines it.
	const getColumnAlignment = ( columnIndex: number ): Alignment =>
		head[ 0 ]?.cells[ columnIndex ]?.align ??
		body[ 0 ]?.cells[ columnIndex ]?.align ??
		foot[ 0 ]?.cells[ columnIndex ]?.align;

	const onCreateTable = ( event: FormEvent ) => {
		event.preventDefault();
		const rows = parseInt( initialRowCount, 10 ) || 2;
		const columns = parseInt( initialColumnCount, 10 ) || 2;
		setAttributes( createEmptyTable( rows, columns ) );
	};

	const updateCellContent = (
		section: Section,
		rowIndex: number,
		columnIndex: number,
		content: string
	) => {
		const nextRows = sectionRows( section ).map( ( row, rIndex ) => {
			if ( rIndex !== rowIndex ) {
				return row;
			}
			return {
				cells: row.cells.map( ( cell, cIndex ) =>
					cIndex === columnIndex ? { ...cell, content } : cell
				),
			};
		} );
		setAttributes( { [ section ]: nextRows } );
	};

	const insertRow = ( delta: 0 | 1 ) => {
		if ( ! selectedCell || selectedCell.section !== 'body' ) {
			return;
		}
		const columns = getColumnCount( head, body );
		const alignments = Array.from(
			{ length: columns },
			( _value, columnIndex ) => getColumnAlignment( columnIndex )
		);
		const insertAt = selectedCell.rowIndex + delta;
		const nextBody = [
			...body.slice( 0, insertAt ),
			createEmptyRow( columns, 'td', alignments ),
			...body.slice( insertAt ),
		];
		setAttributes( { body: nextBody } );
	};

	const deleteRow = () => {
		if ( ! selectedCell || selectedCell.section !== 'body' ) {
			return;
		}
		if ( body.length <= 1 ) {
			return;
		}
		const nextBody = body.filter(
			( _row, rIndex ) => rIndex !== selectedCell.rowIndex
		);
		setSelectedCell( null );
		setAttributes( { body: nextBody } );
	};

	const insertColumn = ( delta: 0 | 1 ) => {
		if ( ! selectedCell ) {
			return;
		}
		const insertAt = selectedCell.columnIndex + delta;
		const insertCellInRow =
			( tag: 'td' | 'th' ) =>
			( row: Row ): Row => ( {
				cells: [
					...row.cells.slice( 0, insertAt ),
					createCell( tag ),
					...row.cells.slice( insertAt ),
				],
			} );
		setAttributes( {
			head: head.map( insertCellInRow( 'th' ) ),
			body: body.map( insertCellInRow( 'td' ) ),
			foot: foot.map( insertCellInRow( 'td' ) ),
		} );
	};

	const deleteColumn = () => {
		if ( ! selectedCell ) {
			return;
		}
		const columns = getColumnCount( head, body );
		if ( columns <= 1 ) {
			return;
		}
		const removeCellFromRow = ( row: Row ): Row => ( {
			cells: row.cells.filter(
				( _cell, cIndex ) => cIndex !== selectedCell.columnIndex
			),
		} );
		setSelectedCell( null );
		setAttributes( {
			head: head.map( removeCellFromRow ),
			body: body.map( removeCellFromRow ),
			foot: foot.map( removeCellFromRow ),
		} );
	};

	// Applies the alignment to every cell of the selected column, across all
	// sections, since Markdown tables align by column rather than by cell.
	const setColumnAlignment = ( align: Alignment ) => {
		if ( ! selectedCell ) {
			return;
		}
		const { columnIndex } = selectedCell;
		const applyToRow = ( row: Row ): Row => ( {
			cells: row.cells.map( ( cell, cIndex ) =>
				cIndex === columnIndex ? { ...cell, align } : cell
			),
		} );
		setAttributes( {
			head: head.map( applyToRow ),
			body: body.map( applyToRow ),
			foot: foot.map( applyToRow ),
		} );
	};

	if ( isEmpty ) {
		return (
			<div { ...blockProps }>
				<Placeholder
					icon={ <BlockIcon icon={ tableIcon } showColors /> }
					label={ __( 'Table', 'mark-bricks' ) }
					instructions={ __(
						'Insert a table for sharing data.',
						'mark-bricks'
					) }
				>
					<Stack
						render={ <form onSubmit={ onCreateTable } /> }
						direction="row"
						wrap="wrap"
						align="flex-end"
						gap="sm"
					>
						<TextControl
							__next40pxDefaultSize
							type="number"
							label={ __( 'Column count', 'mark-bricks' ) }
							value={ initialColumnCount }
							onChange={ ( value ) =>
								setInitialColumnCount( value ?? '' )
							}
							min="1"
						/>
						<TextControl
							__next40pxDefaultSize
							type="number"
							label={ __( 'Row count', 'mark-bricks' ) }
							value={ initialRowCount }
							onChange={ ( value ) =>
								setInitialRowCount( value ?? '' )
							}
							min="1"
						/>
						<Button
							__next40pxDefaultSize
							variant="primary"
							type="submit"
						>
							{ __( 'Create Table', 'mark-bricks' ) }
						</Button>
					</Stack>
				</Placeholder>
			</div>
		);
	}

	const currentColumnAlign: Alignment = selectedCell
		? getColumnAlignment( selectedCell.columnIndex )
		: undefined;

	const renderCell = (
		section: Section,
		rowIndex: number,
		columnIndex: number,
		cell: Cell
	) => {
		const Tag = section === 'head' ? 'th' : 'td';
		const { align } = cell;
		return (
			<Tag
				key={ columnIndex }
				style={ align ? { textAlign: align } : undefined }
				scope={ section === 'head' ? 'col' : undefined }
			>
				<RichText
					value={ ( cell.content ?? '' ) as string }
					onChange={ ( content ) =>
						updateCellContent(
							section,
							rowIndex,
							columnIndex,
							content
						)
					}
					onFocus={ () =>
						setSelectedCell( { section, rowIndex, columnIndex } )
					}
					placeholder={
						section === 'head'
							? __( 'Header label', 'mark-bricks' )
							: __( 'Cell content', 'mark-bricks' )
					}
				/>
			</Tag>
		);
	};

	const renderRows = ( section: Section ) =>
		sectionRows( section ).map( ( row, rowIndex ) => (
			<tr key={ rowIndex }>
				{ row.cells.map( ( cell, columnIndex ) =>
					renderCell( section, rowIndex, columnIndex, cell )
				) }
			</tr>
		) );

	return (
		<>
			<BlockControls group="block">
				<AlignmentControl
					value={ currentColumnAlign }
					onChange={ ( nextAlign ) =>
						setColumnAlignment( nextAlign as Alignment )
					}
				/>
			</BlockControls>
			<BlockControls group="other">
				<ToolbarGroup>
					<ToolbarDropdownMenu
						icon={ tableIcon }
						label={ __( 'Edit table', 'mark-bricks' ) }
						controls={ [
							{
								icon: tableRowBefore,
								title: __( 'Insert row before', 'mark-bricks' ),
								isDisabled:
									! selectedCell ||
									selectedCell.section !== 'body',
								onClick: () => insertRow( 0 ),
							},
							{
								icon: tableRowAfter,
								title: __( 'Insert row after', 'mark-bricks' ),
								isDisabled:
									! selectedCell ||
									selectedCell.section !== 'body',
								onClick: () => insertRow( 1 ),
							},
							{
								icon: tableRowDelete,
								title: __( 'Delete row', 'mark-bricks' ),
								isDisabled:
									! selectedCell ||
									selectedCell.section !== 'body' ||
									body.length <= 1,
								onClick: deleteRow,
							},
							{
								icon: tableColumnBefore,
								title: __(
									'Insert column before',
									'mark-bricks'
								),
								isDisabled: ! selectedCell,
								onClick: () => insertColumn( 0 ),
							},
							{
								icon: tableColumnAfter,
								title: __(
									'Insert column after',
									'mark-bricks'
								),
								isDisabled: ! selectedCell,
								onClick: () => insertColumn( 1 ),
							},
							{
								icon: tableColumnDelete,
								title: __( 'Delete column', 'mark-bricks' ),
								isDisabled:
									! selectedCell ||
									getColumnCount( head, body ) <= 1,
								onClick: deleteColumn,
							},
						] }
					/>
				</ToolbarGroup>
			</BlockControls>
			<figure { ...blockProps }>
				<table>
					{ head.length > 0 && (
						<thead>{ renderRows( 'head' ) }</thead>
					) }
					{ body.length > 0 && (
						<tbody>{ renderRows( 'body' ) }</tbody>
					) }
					{ foot.length > 0 && (
						<tfoot>{ renderRows( 'foot' ) }</tfoot>
					) }
				</table>
			</figure>
		</>
	);
}
