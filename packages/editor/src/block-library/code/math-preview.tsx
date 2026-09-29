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
import { renderMath } from '../../katex';

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

		// The whole block is one display formula, as on GitHub.
		renderMath( code, { displayMode: true } ).then(
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
