/**
 * External dependencies
 */
import { useMemo } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { chevronLeft, chevronRight } from '@wordpress/icons';
import { ThemeProvider } from '@wordpress/theme';
import { Button, Field, IconButton, Select } from '@wordpress/ui';
import '@wordpress/theme/design-tokens.css';

/**
 * Internal dependencies
 */
import './style.css';

const HINT_DURATION = 3000;
const VISIBLE_CLASS = 'is-visible';

// Seeds the theme, which `isRoot` applies to the whole page, with a dark
// background, so that the controls and text in the theme's colors stay
// legible on the toolbar's backdrop and a dark page.
const BACKGROUND_COLOR = '#3c3c3c';

export type PreviewControls = {
	setSlideMode: ( enabled: boolean ) => void;
	setSlide: ( current: number, count: number ) => void;
};

type PagerProps = {
	current: number;
	count: number;
	onNavigate: ( index: number ) => void;
};

function Pager( { current, count, onNavigate }: PagerProps ) {
	const items = useMemo(
		() =>
			Array.from( { length: count }, ( _, index ) => ( {
				label: String( index + 1 ),
				value: String( index ),
			} ) ),
		[ count ]
	);
	return (
		<div className="preview-pager">
			<IconButton
				icon={ chevronLeft }
				label={ __( 'Previous slide', 'mark-bricks' ) }
				variant="minimal"
				tone="neutral"
				size="compact"
				disabled={ current === 0 }
				onClick={ () => onNavigate( current - 1 ) }
			/>
			<Field.Root>
				<Field.Label hideFromVision>
					{ __( 'Slide number', 'mark-bricks' ) }
				</Field.Label>
				<Select.Root
					items={ items }
					value={ items[ current ] ?? null }
					isItemEqualToValue={ ( a, b ) => a.value === b.value }
					onValueChange={ ( item ) => {
						if ( item?.value ) {
							onNavigate( Number( item.value ) );
						}
					} }
				>
					<Select.Trigger size="compact">
						{ ( item: ( typeof items )[ number ] ) =>
							`${ item.label } / ${ count }`
						}
					</Select.Trigger>
					<Select.Popup
						// Opens the list below the trigger rather than over it,
						// where it keeps within the window and scrolls a long
						// deck.
						positioner={
							<Select.Positioner alignItemWithTrigger={ false } />
						}
					>
						{ items.map( ( item ) => (
							<Select.Item
								key={ item.value }
								value={ item }
								label={ item.label }
							>
								<Select.ItemLabel>
									{ item.label }
								</Select.ItemLabel>
							</Select.Item>
						) ) }
					</Select.Popup>
				</Select.Root>
			</Field.Root>
			<IconButton
				icon={ chevronRight }
				label={ __( 'Next slide', 'mark-bricks' ) }
				variant="minimal"
				tone="neutral"
				size="compact"
				disabled={ current >= count - 1 }
				onClick={ () => onNavigate( current + 1 ) }
			/>
		</div>
	);
}

type Props = {
	slideMode: boolean;
	current: number;
	count: number;
	onToggle: () => void;
	onNavigate: ( index: number ) => void;
};

function Toolbar( { slideMode, current, count, onToggle, onNavigate }: Props ) {
	return (
		<ThemeProvider isRoot color={ { background: BACKGROUND_COLOR } }>
			<div className="preview-toolbar">
				{ count > 0 && (
					<Pager
						current={ current }
						count={ count }
						onNavigate={ onNavigate }
					/>
				) }
				<Button variant="outline" tone="neutral" onClick={ onToggle }>
					{ slideMode
						? __( 'Exit slide mode', 'mark-bricks' )
						: __( 'Enter slide mode', 'mark-bricks' ) }
				</Button>
			</div>
		</ThemeProvider>
	);
}

/**
 * Adds a toolbar, shown while the pointer is over it, with a pager to move
 * between the slides and a button that toggles the slide mode, and a hint on
 * how to leave the slide mode.
 *
 * @param toggle   Toggles the slide mode.
 * @param navigate Moves to the slide at an index.
 * @return Functions to update the controls with the slide mode's state and
 *         the current slide.
 */
export function createPreviewControls(
	toggle: () => void,
	navigate: ( index: number ) => void
): PreviewControls {
	let slideMode = false;
	let current = 0;
	let count = 0;
	let hintTimer: number | undefined;

	const toolbar = document.createElement( 'div' );
	const root = createRoot( toolbar );

	const hint = document.createElement( 'div' );
	hint.className = 'preview-hint';
	hint.setAttribute( 'role', 'status' );
	// Empties the hint once it fades out, so that showing it again changes its
	// text and screen readers announce it again.
	hint.addEventListener( 'transitionend', () => {
		if ( ! hint.classList.contains( VISIBLE_CLASS ) ) {
			hint.textContent = '';
		}
	} );

	// Placed before the slides, so that the controls come first in the focus
	// order, as they do on screen.
	document.body.prepend( hint, toolbar );

	function renderToolbar() {
		root.render(
			<Toolbar
				slideMode={ slideMode }
				current={ current }
				count={ count }
				onToggle={ toggle }
				onNavigate={ navigate }
			/>
		);
	}

	function hideHint() {
		window.clearTimeout( hintTimer );
		hint.classList.remove( VISIBLE_CLASS );
		// With reduced motion, the hint does not fade out, and no
		// `transitionend` follows.
		if ( getComputedStyle( hint ).transitionDuration === '0s' ) {
			hint.textContent = '';
		}
	}

	function showHint() {
		hint.textContent = __(
			'Press F or Escape to exit slide mode',
			'mark-bricks'
		);
		hint.classList.add( VISIBLE_CLASS );
		hintTimer = window.setTimeout( hideHint, HINT_DURATION );
	}

	renderToolbar();

	return {
		setSlideMode( value ) {
			slideMode = value;
			renderToolbar();
			hideHint();
			if ( value ) {
				showHint();
			}
		},
		setSlide( currentValue, countValue ) {
			current = currentValue;
			count = countValue;
			renderToolbar();
		},
	};
}
