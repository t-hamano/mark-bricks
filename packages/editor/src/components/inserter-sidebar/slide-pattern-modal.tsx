/**
 * External dependencies
 */
import { useState } from 'react';

/**
 * WordPress dependencies
 */
import { Composite } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { closeSmall, search as searchIcon } from '@wordpress/icons';
import {
	Dialog,
	getWpCompatOverlaySlot,
	Icon,
	IconButton,
	InputControl,
	InputLayout,
	Tabs,
	Text,
} from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { SLIDE_PATTERN_CATEGORIES } from '../../marp-patterns';
import type { SlidePatternPreviews } from '../../marp-patterns/previews';
import { SlidePatternPreview } from './slide-pattern-preview';
import {
	ALL_CATEGORIES,
	useInsertSlidePattern,
	useSlidePatternItems,
	type CategoryFilter,
} from './use-slide-patterns';

type GridProps = {
	search: string;
	category: CategoryFilter;
	previews: SlidePatternPreviews | null;
	onInsert: () => void;
};

function SlidePatternGrid( {
	search,
	category,
	previews,
	onInsert,
}: GridProps ) {
	const patterns = useSlidePatternItems( search, category, previews );
	const insert = useInsertSlidePattern();

	if ( patterns.length === 0 ) {
		return (
			<Text variant="body-sm" className="slide-pattern-modal__empty">
				{ __( 'No slide patterns found.', 'mark-bricks' ) }
			</Text>
		);
	}

	return (
		<Composite
			className="slide-pattern-modal__grid"
			role="listbox"
			aria-label={ __( 'Slide patterns', 'mark-bricks' ) }
			focusLoop
			focusWrap
		>
			{ patterns.map( ( { pattern, title, preview } ) => (
				<Composite.Item
					key={ pattern.name }
					role="option"
					aria-label={ title }
					className="slide-pattern-modal__item"
					onClick={ () => {
						insert( pattern );
						onInsert();
					} }
				>
					<div className="slide-pattern-modal__thumbnail">
						{ preview && (
							<SlidePatternPreview
								html={ preview.html }
								css={ preview.css }
							/>
						) }
					</div>
					<Text variant="body-sm" aria-hidden>
						{ title }
					</Text>
				</Composite.Item>
			) ) }
		</Composite>
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
	const [ search, setSearch ] = useState( '' );
	const [ category, setCategory ] =
		useState< CategoryFilter >( ALL_CATEGORIES );

	const categories: { name: CategoryFilter; label: string }[] = [
		{ name: ALL_CATEGORIES, label: __( 'All', 'mark-bricks' ) },
		...SLIDE_PATTERN_CATEGORIES.map( ( { name, label } ) => ( {
			name,
			label: label(),
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
						<InputControl
							className="slide-pattern-modal__search"
							label={ __(
								'Search for slide patterns',
								'mark-bricks'
							) }
							hideLabelFromVision
							type="search"
							placeholder={ __( 'Search', 'mark-bricks' ) }
							value={ search }
							onValueChange={ setSearch }
							prefix={
								<InputLayout.Slot>
									<Icon icon={ searchIcon } />
								</InputLayout.Slot>
							}
							suffix={
								search ? (
									<InputLayout.Slot padding="minimal">
										<IconButton
											icon={ closeSmall }
											label={ __(
												'Reset search',
												'mark-bricks'
											) }
											variant="minimal"
											tone="neutral"
											size="small"
											onClick={ () => setSearch( '' ) }
										/>
									</InputLayout.Slot>
								) : undefined
							}
						/>
						<Tabs.List
							className="slide-pattern-modal__categories"
							variant="minimal"
						>
							{ categories.map( ( { name, label } ) => (
								<Tabs.Tab key={ name } value={ name }>
									{ label }
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
								search={ search }
								category={ name }
								previews={ previews }
								onInsert={ onClose }
							/>
						</Tabs.Panel>
					) ) }
				</Tabs.Root>
			</Dialog.Popup>
		</Dialog.Root>
	);
}
