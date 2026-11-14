/**
 * External dependencies
 */
import { useCallback, useMemo, useState, type UIEventHandler } from 'react';

/**
 * WordPress dependencies
 */
import { Composite } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Button, SelectControl, Text, Tooltip } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import {
	SLIDE_PATTERN_CATEGORIES,
	type SlidePattern,
} from '../../marp-patterns';
import { SlidePatternPreview } from '../slide-pattern-preview';
import { SlidePatternModal } from '../slide-pattern-modal';
import { useInsertionPointPreview } from '../../inserter/insertion-target';
import {
	ALL_CATEGORIES,
	useInsertSlidePattern,
	useSlidePatternItems,
	useSlidePatternPreviews,
	type CategoryFilter,
} from '../../inserter/use-slide-patterns';

type Props = {
	search: string;
	onScroll: UIEventHandler< HTMLDivElement >;
};

export function SlidePatternList( { search, onScroll }: Props ) {
	const [ category, setCategory ] =
		useState< CategoryFilter >( ALL_CATEGORIES );
	const [ isModalOpen, setIsModalOpen ] = useState( false );
	// The cards show their titles until the previews have loaded. After that,
	// a card shows its preview, and its title in a tooltip.
	const previews = useSlidePatternPreviews();
	const patterns = useSlidePatternItems( search, category, previews );

	const categoryItems = useMemo(
		() => [
			{
				value: ALL_CATEGORIES,
				label: __( 'All categories', 'mark-bricks' ),
			},
			...SLIDE_PATTERN_CATEGORIES.map( ( { name, label } ) => ( {
				value: name,
				label: label(),
			} ) ),
		],
		[]
	);

	const insertionPoint = useInsertionPointPreview();
	const insert = useInsertSlidePattern();

	const insertPattern = useCallback(
		( pattern: SlidePattern ) => {
			insert( pattern );
			insertionPoint.hide();
		},
		[ insert, insertionPoint ]
	);

	return (
		<Tooltip.Provider>
			<div className="inserter-sidebar__pattern-filter">
				<SelectControl
					label={ __( 'Category', 'mark-bricks' ) }
					hideLabelFromVision
					size="compact"
					items={ categoryItems }
					value={ categoryItems.find(
						( item ) => item.value === category
					) }
					onValueChange={ ( next ) => {
						if ( next?.value ) {
							setCategory( next.value as CategoryFilter );
						}
					} }
				/>
			</div>
			{ patterns.length === 0 && (
				<Text
					variant="body-sm"
					className="inserter-sidebar__pattern-empty"
				>
					{ __( 'No slide patterns found.', 'mark-bricks' ) }
				</Text>
			) }
			<Composite
				className="inserter-sidebar__pattern-list"
				role="listbox"
				aria-label={ __( 'Slide patterns', 'mark-bricks' ) }
				onScroll={ onScroll }
				focusLoop
				focusWrap
			>
				{ patterns.map( ( { pattern, title, preview } ) => (
					<Tooltip.Root key={ pattern.name } disabled={ ! preview }>
						<Composite.Item
							role="option"
							aria-label={ title }
							className="inserter-sidebar__pattern-list-item"
							onClick={ () => insertPattern( pattern ) }
							onMouseEnter={ insertionPoint.show }
							onMouseLeave={ insertionPoint.hide }
							onFocus={ insertionPoint.show }
							onBlur={ insertionPoint.hide }
							render={
								<Tooltip.Trigger
									render={
										<Button
											variant="outline"
											tone="neutral"
										/>
									}
								/>
							}
						>
							{ preview ? (
								<SlidePatternPreview
									html={ preview.html }
									css={ preview.css }
								/>
							) : (
								<Text
									variant="body-sm"
									className="inserter-sidebar__pattern-title"
								>
									{ title }
								</Text>
							) }
						</Composite.Item>
						<Tooltip.Popup>{ title }</Tooltip.Popup>
					</Tooltip.Root>
				) ) }
			</Composite>
			<div className="inserter-sidebar__pattern-footer">
				<Button
					className="inserter-sidebar__pattern-explore"
					variant="outline"
					onClick={ () => setIsModalOpen( true ) }
				>
					{ __( 'Explore Marp patterns', 'mark-bricks' ) }
				</Button>
			</div>
			{ isModalOpen && (
				<SlidePatternModal
					previews={ previews }
					onClose={ () => setIsModalOpen( false ) }
				/>
			) }
		</Tooltip.Provider>
	);
}
