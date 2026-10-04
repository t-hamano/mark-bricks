type Theme = 'light' | 'dark';

const toggle = document.getElementById( 'theme-toggle' );
const demo =
	document.querySelector< HTMLIFrameElement >( '#playground iframe' );
const imageSources = document.querySelectorAll< HTMLSourceElement >(
	'.feature-screenshot source'
);
const systemTheme = window.matchMedia( '(prefers-color-scheme: dark)' );
let theme: Theme = systemTheme.matches ? 'dark' : 'light';
let hasManualTheme = false;

function syncEditorTheme() {
	demo?.contentWindow?.postMessage(
		{ type: 'mark-bricks:theme', theme },
		window.location.origin
	);
}

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
	syncEditorTheme();
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
demo?.addEventListener( 'load', syncEditorTheme );
window.addEventListener( 'message', ( event: MessageEvent< unknown > ) => {
	if (
		event.origin !== window.location.origin ||
		event.source !== demo?.contentWindow ||
		! event.data ||
		typeof event.data !== 'object' ||
		! ( 'type' in event.data )
	) {
		return;
	}
	if ( event.data.type === 'mark-bricks:demo-ready' ) {
		syncEditorTheme();
	} else if ( event.data.type === 'mark-bricks:demo-exit' ) {
		document.getElementById( 'playground-storybook' )?.focus();
	}
} );
setTheme( theme );
