type Theme = 'light' | 'dark';

const toggle = document.getElementById( 'theme-toggle' );
const imageSources = document.querySelectorAll< HTMLSourceElement >(
	'.feature-screenshot source'
);
const systemTheme = window.matchMedia( '(prefers-color-scheme: dark)' );
let theme: Theme = systemTheme.matches ? 'dark' : 'light';
let hasManualTheme = false;

function setTheme( next: Theme ) {
	theme = next;
	document.documentElement.dataset.theme = next;
	toggle?.setAttribute( 'aria-pressed', String( next === 'dark' ) );
	toggle?.setAttribute(
		'title',
		`Switch to ${ next === 'dark' ? 'light' : 'dark' } mode`
	);
	document
		.querySelector( 'meta[name="theme-color"]' )
		?.setAttribute( 'content', next === 'dark' ? '#14171c' : '#ffffff' );
	imageSources.forEach( ( source ) => {
		source.media = next === 'dark' ? 'all' : 'not all';
	} );
}

toggle?.addEventListener( 'click', () => {
	hasManualTheme = true;
	setTheme( theme === 'light' ? 'dark' : 'light' );
} );
systemTheme.addEventListener( 'change', ( event ) => {
	if ( ! hasManualTheme ) {
		setTheme( event.matches ? 'dark' : 'light' );
	}
} );
setTheme( theme );
