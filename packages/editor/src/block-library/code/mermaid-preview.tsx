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

function importMermaid() {
	return import( 'mermaid' ).then( ( { default: mermaid } ) => mermaid );
}

let mermaidPromise: Promise< Mermaid > | null = null;

/**
 * Loads mermaid on first use and configures it once.
 *
 * @return The configured mermaid instance.
 */
function loadMermaid(): Promise< Mermaid > {
	if ( ! mermaidPromise ) {
		mermaidPromise = importMermaid().then( ( mermaid ) => {
			mermaid.initialize( {
				startOnLoad: false,
				securityLevel: 'strict',
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
		const timer = setTimeout( render, 300 );

		return () => {
			cancelled = true;
			clearTimeout( timer );
		};
	}, [ code, clientId ] );

	if ( ! svg && ! error ) {
		return null;
	}

	return (
		<Stack className="wp-block-code__mermaid" direction="column" gap="lg">
			{ !! svg && (
				<div
					className={ clsx( 'wp-block-code__mermaid-diagram', {
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
					<Notice.Description className="wp-block-code__mermaid-error-detail">
						{ error }
					</Notice.Description>
				</Notice.Root>
			) }
		</Stack>
	);
}
