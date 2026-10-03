/**
 * WordPress dependencies
 */
import { createRoot } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { chevronLeft, chevronRight, Icon } from '@wordpress/icons';

const HINT_DURATION = 3000;
const VISIBLE_CLASS = 'is-visible';

export type Toolbar = {
	setSlideMode: ( enabled: boolean ) => void;
	setSlide: ( current: number, count: number ) => void;
};

type IconButtonProps = {
	icon: typeof chevronLeft;
	label: string;
	disabled: boolean;
	onClick: () => void;
};

function IconButton( { icon, label, disabled, onClick }: IconButtonProps ) {
	return (
		<button
			type="button"
			className="mark-bricks-button is-icon"
			aria-label={ label }
			title={ label }
			disabled={ disabled }
			onClick={ onClick }
		>
			<Icon icon={ icon } />
		</button>
	);
}

type Props = {
	locale: string;
	slideMode: boolean;
	current: number;
	count: number;
	onToggle: () => void;
	onNavigate: ( index: number ) => void;
};

function ToolbarContent( {
	locale,
	slideMode,
	current,
	count,
	onToggle,
	onNavigate,
}: Props ) {
	return (
		<div className="mark-bricks-toolbar" lang={ locale }>
			{ count > 0 && (
				<div className="mark-bricks-pager">
					<IconButton
						icon={ chevronLeft }
						label={ __( 'Previous slide', 'mark-bricks' ) }
						disabled={ current === 0 }
						onClick={ () => onNavigate( current - 1 ) }
					/>
					<select
						className="mark-bricks-select"
						aria-label={ __( 'Slide number', 'mark-bricks' ) }
						value={ String( current ) }
						onChange={ ( event ) =>
							onNavigate( Number( event.currentTarget.value ) )
						}
					>
						{ Array.from( { length: count }, ( _, index ) => (
							<option key={ index } value={ String( index ) }>
								{ `${ index + 1 } / ${ count }` }
							</option>
						) ) }
					</select>
					<IconButton
						icon={ chevronRight }
						label={ __( 'Next slide', 'mark-bricks' ) }
						disabled={ current >= count - 1 }
						onClick={ () => onNavigate( current + 1 ) }
					/>
				</div>
			) }
			<button
				type="button"
				className="mark-bricks-button"
				onClick={ onToggle }
			>
				{ slideMode
					? __( 'Exit slide mode', 'mark-bricks' )
					: __( 'Enter slide mode', 'mark-bricks' ) }
			</button>
		</div>
	);
}

/**
 * Adds the toolbar of the preview to an exported page, without the
 * preview's components: it shows while the pointer is over it, with a pager
 * to move between the slides and a button that toggles the slide mode. Also
 * adds a hint on how to leave the slide mode.
 *
 * @param toggle   Toggles the slide mode.
 * @param navigate Moves to the slide at an index.
 * @param locale   Language tag of the toolbar's strings, if not English.
 * @return Functions to update the toolbar with the slide mode's state and
 *         the current slide.
 */
export function createToolbar(
	toggle: () => void,
	navigate: ( index: number ) => void,
	locale = 'en'
): Toolbar {
	let slideMode = false;
	let current = 0;
	let count = 0;
	let hintTimer: number | undefined;

	const toolbar = document.createElement( 'div' );
	const root = createRoot( toolbar );

	const hint = document.createElement( 'div' );
	hint.className = 'mark-bricks-hint';
	hint.lang = locale;
	hint.setAttribute( 'role', 'status' );
	// Empties the hint once it fades out, so that showing it again changes its
	// text and screen readers announce it again.
	hint.addEventListener( 'transitionend', () => {
		if ( ! hint.classList.contains( VISIBLE_CLASS ) ) {
			hint.textContent = '';
		}
	} );

	// Placed before the slides, so that the toolbar comes first in the focus
	// order, as it does on screen.
	document.body.prepend( hint, toolbar );

	function renderToolbar() {
		root.render(
			<ToolbarContent
				locale={ locale }
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
