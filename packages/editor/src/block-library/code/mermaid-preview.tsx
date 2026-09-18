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

/**
 * Internal dependencies
 */
import {
	useEditorTheme,
	type EditorTheme,
} from '../../components/editor-theme-provider';

const loadMermaid = () =>
	import( 'mermaid' ).then( ( { default: mermaid } ) => mermaid );
let mermaidPromise: ReturnType< typeof loadMermaid > | undefined;
let renderQueue: Promise< unknown > = Promise.resolve();

/**
 * Mermaid configuration is global. Serialize initialization and rendering so
 * diagrams in different theme providers cannot change one another's colors.
 * Diagram frontmatter continues to take precedence over the default theme.
 *
 * @param id    Unique diagram ID.
 * @param code  Diagram source, preserved without injecting theme directives.
 * @param theme Editor appearance.
 */
function renderMermaid( id: string, code: string, theme: EditorTheme ) {
	const result = renderQueue.then( async () => {
		const mermaid = await ( mermaidPromise ??= loadMermaid() );
		mermaid.initialize( {
			startOnLoad: false,
			securityLevel: 'strict',
			suppressErrorRendering: true,
			...( theme === 'dark'
				? { theme: 'dark' as const, darkMode: true }
				: {} ),
		} );
		await mermaid.parse( code );
		return mermaid.render( id, code );
	} );
	// A malformed diagram must not prevent later diagrams from rendering.
	renderQueue = result.catch( () => {} );
	return result;
}

type Props = {
	code: string;
	clientId: string;
};

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
	const theme = useEditorTheme();
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
				const { svg: nextSvg } = await renderMermaid(
					`mermaid-${ clientId }`,
					code,
					theme
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
	}, [ code, clientId, theme ] );

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
