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

const loadKatex = () =>
	import( 'katex' ).then( ( { default: katex } ) => katex );
let katexPromise: ReturnType< typeof loadKatex > | undefined;

/**
 * Renders TeX to HTML, with MathML alongside for screen readers.
 *
 * The HTML is styled by KaTeX's stylesheet and fonts, which the block canvas
 * loads (see `katex-styles.ts`). `trust` stays off, so commands such as
 * `\href` cannot inject links or other HTML.
 *
 * @param code TeX source of the whole block, rendered as one display formula.
 * @return The formula markup.
 */
async function renderMath( code: string ) {
	const katex = await ( katexPromise ??= loadKatex() );
	return katex.renderToString( code, {
		displayMode: true,
		output: 'htmlAndMathml',
		throwOnError: true,
		trust: false,
		strict: false,
	} );
}

type Props = {
	code: string;
};

/**
 * Renders a formula from the code of a `math` code block, the fenced form
 * GitHub renders as a display formula.
 *
 * While the code does not parse, the last formula that did is kept on screen
 * so that typing does not collapse the block on every keystroke.
 *
 * @param props      The component props.
 * @param props.code The TeX source of the formula.
 * @return The rendered formula, the error that stopped it, or both, and
 *         nothing at all until there is something to show.
 */
export function MathPreview( { code }: Props ) {
	const [ html, setHtml ] = useState( '' );
	const [ error, setError ] = useState< string | null >( null );

	useEffect( () => {
		if ( ! code.trim() ) {
			setHtml( '' );
			setError( null );
			return;
		}

		let cancelled = false;

		renderMath( code ).then(
			( nextHtml ) => {
				if ( ! cancelled ) {
					setHtml( nextHtml );
					setError( null );
				}
			},
			( failure: unknown ) => {
				if ( ! cancelled ) {
					setError(
						failure instanceof Error
							? failure.message
							: String( failure )
					);
				}
			}
		);

		return () => {
			cancelled = true;
		};
	}, [ code ] );

	if ( ! html && ! error ) {
		return null;
	}

	return (
		<Stack className="wp-block-code__preview" direction="column" gap="lg">
			{ !! html && (
				<div
					className={ clsx( 'wp-block-code__preview-content', {
						'is-stale': !! error,
					} ) }
					dangerouslySetInnerHTML={ { __html: html } }
				/>
			) }
			{ !! error && (
				<Notice.Root
					className="wp-block-code__preview-error"
					intent="error"
				>
					<Notice.Title>
						{ __(
							'The formula could not be rendered.',
							'mark-bricks'
						) }
					</Notice.Title>
					<Notice.Description className="wp-block-code__preview-error-detail">
						{ error }
					</Notice.Description>
				</Notice.Root>
			) }
		</Stack>
	);
}
