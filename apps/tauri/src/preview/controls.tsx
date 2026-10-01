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

/**
 * Internal dependencies
 */
import type { PreviewLabels } from './constants';

const HINT_DURATION = 3000;
const VISIBLE_CLASS = 'is-visible';

// Seeds the theme with the window's background, so that the controls and the
// notice text stay legible on it.
const BACKGROUND_COLOR = '#3c3c3c';

export type PreviewControls = {
	setLabels: ( labels: PreviewLabels ) => void;
	setFullscreen: ( fullscreen: boolean ) => void;
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
					<Select.Popup finalFocus={ false }>
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
	fullscreen: boolean;
	current: number;
	count: number;
	onToggle: () => void;
	onNavigate: ( index: number ) => void;
};

function Toolbar( {
	labels,
	fullscreen,
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
						{ fullscreen
							? labels.exitFullscreen
							: labels.enterFullscreen }
					</Button>
				</div>
			) }
		</ThemeProvider>
	);
}

/**
 * Adds a toolbar, shown while the pointer is over it, with a pager to move
 * between the slides and a button that toggles full screen, and a hint on how
 * to leave full screen.
 *
 * @param toggle   Toggles full screen.
 * @param navigate Moves to the slide at an index.
 * @return Functions to update the controls with the labels, the full screen
 *         state and the current slide.
 */
export function createPreviewControls(
	toggle: () => void,
	navigate: ( index: number ) => void
): PreviewControls {
	let labels: PreviewLabels | null = null;
	let fullscreen = false;
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
				fullscreen={ fullscreen }
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
		hint.textContent = labels.exitFullscreenHint;
		hint.classList.add( VISIBLE_CLASS );
		hintTimer = window.setTimeout( hideHint, HINT_DURATION );
	}

	return {
		setLabels( value ) {
			labels = value;
			renderToolbar();
		},
		setFullscreen( value ) {
			fullscreen = value;
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
