/**
 * External dependencies
 */
import { useMemo } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * WordPress dependencies
 */
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

// Text of the controls. The host translates it, since the preview pages load
// no translations.
export type PreviewLabels = {
	enterSlideMode: string;
	exitSlideMode: string;
	exitSlideModeHint: string;
	previousSlide: string;
	nextSlide: string;
	slideNumber: string;
};

export type PreviewControls = {
	setLabels: ( labels: PreviewLabels ) => void;
	setSlideMode: ( enabled: boolean ) => void;
	setSlide: ( current: number, count: number ) => void;
};

type PagerProps = {
	labels: PreviewLabels;
	current: number;
	count: number;
	onNavigate: ( index: number ) => void;
};

function Pager( { labels, current, count, onNavigate }: PagerProps ) {
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
				label={ labels.previousSlide }
				variant="minimal"
				tone="neutral"
				size="compact"
				disabled={ current === 0 }
				onClick={ ( event ) => {
					onNavigate( current - 1 );
					event.currentTarget.blur();
				} }
			/>
			<Field.Root>
				<Field.Label hideFromVision>{ labels.slideNumber }</Field.Label>
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
					{ /*
					 * Like the buttons, the select gives up focus once used, so
					 * that keyboard input does not open it again, and the
					 * toolbar hides once the pointer leaves.
					 */ }
					<Select.Popup
						finalFocus={ false }
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
				label={ labels.nextSlide }
				variant="minimal"
				tone="neutral"
				size="compact"
				disabled={ current >= count - 1 }
				onClick={ ( event ) => {
					onNavigate( current + 1 );
					event.currentTarget.blur();
				} }
			/>
		</div>
	);
}

type Props = {
	labels: PreviewLabels | null;
	slideMode: boolean;
	current: number;
	count: number;
	onToggle: () => void;
	onNavigate: ( index: number ) => void;
};

function Toolbar( {
	labels,
	slideMode,
	current,
	count,
	onToggle,
	onNavigate,
}: Props ) {
	return (
		<ThemeProvider isRoot color={ { background: BACKGROUND_COLOR } }>
			{ labels && (
				<div className="preview-toolbar">
					{ count > 0 && (
						<Pager
							labels={ labels }
							current={ current }
							count={ count }
							onNavigate={ onNavigate }
						/>
					) }
					<Button
						variant="outline"
						tone="neutral"
						onClick={ ( event ) => {
							onToggle();
							event.currentTarget.blur();
						} }
					>
						{ slideMode
							? labels.exitSlideMode
							: labels.enterSlideMode }
					</Button>
				</div>
			) }
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
 * @return Functions to update the controls with the labels, the slide mode's
 *         state and the current slide.
 */
export function createPreviewControls(
	toggle: () => void,
	navigate: ( index: number ) => void
): PreviewControls {
	let labels: PreviewLabels | null = null;
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
				labels={ labels }
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
		if ( ! labels ) {
			return;
		}
		hint.textContent = labels.exitSlideModeHint;
		hint.classList.add( VISIBLE_CLASS );
		hintTimer = window.setTimeout( hideHint, HINT_DURATION );
	}

	return {
		setLabels( value ) {
			labels = value;
			renderToolbar();
		},
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
