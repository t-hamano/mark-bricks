/**
 * External dependencies
 */
import { useMemo, useState } from 'react';

/**
 * WordPress dependencies
 */
import { RangeControl } from '@wordpress/components';
import { DataViews, type Field, type ViewGrid } from '@wordpress/dataviews';
import '@wordpress/dataviews/build-style/style.css';
import { __ } from '@wordpress/i18n';
import {
	Dialog,
	getWpCompatOverlaySlot,
	Stack,
	Tabs,
	Text,
} from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { SLIDE_PATTERN_CATEGORIES, SLIDE_PATTERNS } from '../../marp-patterns';
import type { SlidePatternPreviews } from '../../marp-patterns/previews';
import { SlidePatternPreview } from '../slide-pattern-preview';
import {
	ALL_CATEGORIES,
	useInsertSlidePattern,
	useSlidePatternItems,
	type CategoryFilter,
} from '../../inserter/use-slide-patterns';
import './style.scss';

// The widths of the previews that the size slider offers, in pixels.
// DataViews' own smallest sizes are too small to read a slide at.
const PREVIEW_SIZES = [ 230, 290, 350, 430 ];

const DEFAULT_VIEW: ViewGrid = {
	type: 'grid',
	titleField: 'title',
	mediaField: 'preview',
	fields: [],
	layout: {
		aspectRatio: '16/9',
		previewSize: PREVIEW_SIZES[ 1 ],
	},
};

type Item = ReturnType< typeof useSlidePatternItems >[ number ];

// A function, so the labels are translated with the locale set when the
// modal opens, not when the module loads.
const getFields = (): Field< Item >[] => [
	{
		id: 'preview',
		label: __( 'Preview', 'mark-bricks' ),
		render: ( { item } ) =>
			item.preview ? (
				<SlidePatternPreview
					html={ item.preview.html }
					css={ item.preview.css }
				/>
			) : null,
		enableSorting: false,
		enableHiding: false,
	},
	{
		id: 'title',
		label: __( 'Title', 'mark-bricks' ),
		type: 'text',
		getValue: ( { item } ) => item.title,
		enableSorting: false,
		enableHiding: false,
		filterBy: false,
	},
];

type GridProps = {
	category: CategoryFilter;
	previews: SlidePatternPreviews | null;
	view: ViewGrid;
	onChangeView: ( view: ViewGrid ) => void;
	onInsert: () => void;
};

function SlidePatternGrid( {
	category,
	previews,
	view,
	onChangeView,
	onInsert,
}: GridProps ) {
	const items = useSlidePatternItems( '', category, previews );
	const insert = useInsertSlidePattern();
	const fields = useMemo( getFields, [] );
	const previewSize = view.layout?.previewSize ?? PREVIEW_SIZES[ 1 ];
	// Every pattern shows on one page.
	const paginationInfo = useMemo(
		() => ( { totalItems: items.length, totalPages: 1 } ),
		[ items.length ]
	);

	return (
		<DataViews< Item >
			data={ items }
			fields={ fields }
			view={ { ...view, perPage: items.length } }
			onChangeView={ ( next ) => onChangeView( next as ViewGrid ) }
			paginationInfo={ paginationInfo }
			defaultLayouts={ { grid: {} } }
			getItemId={ ( item ) => item.pattern.name }
			onClickItem={ ( item: Item ) => {
				insert( item.pattern );
				onInsert();
			} }
			isItemClickable={ () => true }
			empty={
				<Text variant="body-sm">
					{ __( 'No slide patterns found.', 'mark-bricks' ) }
				</Text>
			}
		>
			{ /* A toolbar of its own in place of the default one: only the
			size of the previews can be changed. */ }
			<Stack
				direction="row"
				justify="flex-end"
				className="slide-pattern-modal__toolbar"
			>
				<div className="slide-pattern-modal__preview-size">
					<RangeControl
						__next40pxDefaultSize
						hideLabelFromVision
						label={ __( 'Preview size', 'mark-bricks' ) }
						showTooltip={ false }
						withInputField={ false }
						min={ 0 }
						max={ PREVIEW_SIZES.length - 1 }
						step={ 1 }
						marks={ PREVIEW_SIZES.map( ( _, index ) => ( {
							value: index,
						} ) ) }
						value={ Math.max(
							0,
							PREVIEW_SIZES.indexOf( previewSize )
						) }
						onChange={ ( index = 0 ) =>
							onChangeView( {
								...view,
								layout: {
									...view.layout,
									previewSize: PREVIEW_SIZES[ index ],
								},
							} )
						}
					/>
				</div>
			</Stack>
			<DataViews.Layout />
		</DataViews>
	);
}

type Props = {
	previews: SlidePatternPreviews | null;
	onClose: () => void;
};

/**
 * A modal that lists every slide pattern, with the categories in a sidebar
 * and the patterns of the chosen one in a grid. Choosing a pattern inserts it
 * and closes the modal.
 *
 * @param props          Component props.
 * @param props.previews Loaded previews, or null while they load.
 * @param props.onClose  Called when the modal closes.
 */
export function SlidePatternModal( { previews, onClose }: Props ) {
	// The preview size is kept as the categories change.
	const [ view, setView ] = useState< ViewGrid >( DEFAULT_VIEW );
	const [ category, setCategory ] =
		useState< CategoryFilter >( ALL_CATEGORIES );

	const categories: {
		name: CategoryFilter;
		label: string;
		count: number;
	}[] = [
		{
			name: ALL_CATEGORIES,
			label: __( 'All', 'mark-bricks' ),
			count: SLIDE_PATTERNS.length,
		},
		...SLIDE_PATTERN_CATEGORIES.map( ( { name, label } ) => ( {
			name,
			label: label(),
			count: SLIDE_PATTERNS.filter( ( pattern ) =>
				pattern.categories.includes( name )
			).length,
		} ) ),
	];

	return (
		<Dialog.Root
			open
			onOpenChange={ ( open ) => {
				if ( ! open ) {
					onClose();
				}
			} }
		>
			<Dialog.Popup
				className="slide-pattern-modal"
				size="full"
				portal={
					<Dialog.Portal container={ getWpCompatOverlaySlot() } />
				}
			>
				<Dialog.Header>
					<Dialog.Title>
						{ __( 'Marp patterns', 'mark-bricks' ) }
					</Dialog.Title>
					<Dialog.CloseIcon label={ __( 'Close', 'mark-bricks' ) } />
				</Dialog.Header>
				<Tabs.Root
					className="slide-pattern-modal__body"
					orientation="vertical"
					value={ category }
					onValueChange={ ( value ) =>
						setCategory( value as CategoryFilter )
					}
				>
					<div className="slide-pattern-modal__sidebar">
						<Tabs.List
							className="slide-pattern-modal__categories"
							variant="minimal"
						>
							{ categories.map( ( { name, label, count } ) => (
								<Tabs.Tab key={ name } value={ name }>
									<span className="slide-pattern-modal__category-label">
										{ label }
									</span>
									<span className="slide-pattern-modal__category-count">
										{ count }
									</span>
								</Tabs.Tab>
							) ) }
						</Tabs.List>
					</div>
					{ categories.map( ( { name } ) => (
						<Tabs.Panel
							key={ name }
							value={ name }
							className="slide-pattern-modal__panel"
							tabIndex={ -1 }
						>
							<SlidePatternGrid
								category={ name }
								previews={ previews }
								view={ view }
								onChangeView={ setView }
								onInsert={ onClose }
							/>
						</Tabs.Panel>
					) ) }
				</Tabs.Root>
			</Dialog.Popup>
		</Dialog.Root>
	);
}
