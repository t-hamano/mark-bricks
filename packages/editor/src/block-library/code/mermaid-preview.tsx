/**
 * External dependencies
 */
import clsx from 'clsx';
import { useEffect, useState } from 'react';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { Notice, Stack } from '@wordpress/ui';

type Props = {
	code: string;
	clientId: string;
};

type Mermaid = Awaited< ReturnType< typeof importMermaid > >;

// Mermaid measures label text in the top-level document, while the diagram is
// injected into the editor canvas iframe. Pinning the font keeps the measured
// and the painted text in sync across the two documents.
const FONT_FAMILY =
	'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif';

// The diagram is rendered next to the editor while the code is typed, so the
// half-written states in between are skipped.
const RENDER_DELAY = 300;

function importMermaid() {
	return import( 'mermaid' ).then( ( { default: mermaid } ) => mermaid );
}

let mermaidPromise: Promise< Mermaid > | null = null;

/**
 * Loads mermaid on first use and configures it once.
 *
 * The library is a few hundred kilobytes, so it is imported dynamically and
 * only ends up in the bundle of documents that actually contain a diagram.
 *
 * @return The configured mermaid instance.
 */
function loadMermaid(): Promise< Mermaid > {
	if ( ! mermaidPromise ) {
		mermaidPromise = importMermaid().then( ( mermaid ) => {
			mermaid.initialize( {
				// Diagrams are rendered on demand, never by scanning the page.
				startOnLoad: false,
				// Sanitizes the labels of the document being edited.
				securityLevel: 'strict',
				fontFamily: FONT_FAMILY,
				// Failures are reported by this component; mermaid must not
				// inject its own error diagram into the canvas.
				suppressErrorRendering: true,
			} );
			return mermaid;
		} );
	}
	return mermaidPromise;
}

/**
 * Renders a mermaid diagram from the code of a `mermaid` code block.
 *
 * While the code does not parse, the last diagram that did is kept on screen
 * so that typing does not collapse the block on every keystroke.
 *
 * @param props          The component props.
 * @param props.code     The mermaid diagram definition.
 * @param props.clientId The client ID of the block, used to give the SVG a
 *                       document-unique ID.
 * @return The rendered diagram, the error that stopped it, or both, and
 *         nothing at all until there is something to show.
 */
export function MermaidPreview( { code, clientId }: Props ) {
	const [ svg, setSvg ] = useState( '' );
	const [ error, setError ] = useState< string | null >( null );

	useEffect( () => {
		if ( ! code.trim() ) {
			setSvg( '' );
			setError( null );
			return;
		}

		let cancelled = false;

		const render = async () => {
			try {
				const mermaid = await loadMermaid();
				await mermaid.parse( code );
				const { svg: nextSvg } = await mermaid.render(
					`mermaid-${ clientId }`,
					code
				);
				if ( ! cancelled ) {
					setSvg( nextSvg );
					setError( null );
				}
			} catch ( failure ) {
				if ( ! cancelled ) {
					setError(
						failure instanceof Error
							? failure.message
							: String( failure )
					);
				}
			}
		};
		const timer = setTimeout( render, RENDER_DELAY );

		return () => {
			cancelled = true;
			clearTimeout( timer );
		};
	}, [ code, clientId ] );

	// Nothing has been rendered yet, and nothing has failed either. The block
	// shows only its editor rather than an empty surface.
	if ( ! svg && ! error ) {
		return null;
	}

	return (
		<Stack className="wp-block-code__mermaid" direction="column" gap="lg">
			{ !! svg && (
				<div
					className={ clsx( 'wp-block-code__mermaid-diagram', {
						// The diagram no longer matches the code being written.
						'is-stale': !! error,
					} ) }
					dangerouslySetInnerHTML={ { __html: svg } }
				/>
			) }
			{ !! error && (
				<Notice.Root
					className="wp-block-code__mermaid-error"
					intent="error"
				>
					<Notice.Title>
						{ __(
							'The diagram could not be rendered.',
							'mark-bricks'
						) }
					</Notice.Title>
					<Notice.Description
						className="wp-block-code__mermaid-error-detail"
						render={ <pre /> }
					>
						{ error }
					</Notice.Description>
				</Notice.Root>
			) }
		</Stack>
	);
}
