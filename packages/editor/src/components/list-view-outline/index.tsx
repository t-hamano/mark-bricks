/**
 * External dependencies
 */
import { useMemo, useRef } from 'react';
import clsx from 'clsx';

/**
 * WordPress dependencies
 */
import { useSelect, useDispatch } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { type Block } from '@wordpress/blocks';
import { __, sprintf } from '@wordpress/i18n';
import { create, getTextContent } from '@wordpress/rich-text';
import { Stack, Text } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { name as HEADING } from '../../block-library/heading';
import EmptyOutlineIllustration from './empty-outline-illustration';
import './style.scss';

interface OutlineHeading {
	clientId: string;
	level: number;
	isEmpty: boolean;
	content: string;
}

function computeOutlineHeadings( blocks: Block[] ) {
	const out: OutlineHeading[] = [];
	function walk( arr: Block[] ) {
		for ( const block of arr ) {
			if ( block.name === HEADING ) {
				const attrs = block.attributes as {
					level?: number;
					content?: string;
				};
				out.push( {
					clientId: block.clientId,
					level: typeof attrs.level === 'number' ? attrs.level : 2,
					isEmpty:
						! attrs.content || attrs.content.trim().length === 0,
					content: attrs.content ?? '',
				} );
			}
			if ( block.innerBlocks?.length ) {
				walk( block.innerBlocks );
			}
		}
	}
	walk( blocks );
	return out;
}

export function ListViewOutline() {
	const blocks = useSelect(
		( select ) => select( blockEditorStore ).getBlocks(),
		[]
	);
	const { selectBlock } = useDispatch( blockEditorStore );
	const prevHeadingLevelRef = useRef( 1 );

	const headings = useMemo(
		() => computeOutlineHeadings( blocks ),
		[ blocks ]
	);

	const countByLevel = headings.reduce< Record< number, number > >(
		( acc, heading ) => ( {
			...acc,
			[ heading.level ]: ( acc[ heading.level ] || 0 ) + 1,
		} ),
		{}
	);
	const hasMultipleH1 = ( countByLevel[ 1 ] || 0 ) > 1;

	return (
		<div className="list-view-outline">
			{ headings.length < 1 ? (
				<Stack
					direction="column"
					align="center"
					className="list-view-outline__document has-no-headings"
					gap="md"
				>
					<Stack direction="column" align="center">
						<EmptyOutlineIllustration />
					</Stack>
					<Text
						variant="body-sm"
						style={ {
							color: 'var(--wpds-color-fg-content-neutral-weak)',
						} }
					>
						{ __(
							'Navigate the structure of your document and address issues like empty or incorrect heading levels.',
							'mark-bricks'
						) }
					</Text>
				</Stack>
			) : (
				<div className="list-view-outline__document">
					<ul>
						{ headings.map( ( item ) => {
							const levelLabel = sprintf(
								/* translators: %d: heading level (1-6) */
								__( 'H%d', 'mark-bricks' ),
								item.level
							);
							const isIncorrectLevel =
								item.level > prevHeadingLevelRef.current + 1;
							const isValid =
								! item.isEmpty &&
								! isIncorrectLevel &&
								!! item.level &&
								( item.level !== 1 || ! hasMultipleH1 );
							prevHeadingLevelRef.current = item.level;

							return (
								<Stack
									key={ item.clientId }
									render={ <li /> }
									className={ clsx(
										'list-view-outline__document-item',
										`is-h${ item.level }`,
										{
											'is-invalid': ! isValid,
										}
									) }
								>
									<Stack
										render={
											// eslint-disable-next-line jsx-a11y/anchor-has-content -- Children are injected via Stack's polymorphic render prop.
											<a
												href={ `#block-${ item.clientId }` }
												onClick={ ( event ) => {
													event.preventDefault();
													selectBlock(
														item.clientId
													);
												} }
											/>
										}
										className="list-view-outline__document-button"
										align="flex-start"
									>
										<span
											className="list-view-outline__document-emdash"
											aria-hidden="true"
										/>
										<strong className="list-view-outline__document-level">
											{ levelLabel }
										</strong>
										<span className="list-view-outline__document-item-content">
											{ item.isEmpty ? (
												<em>
													{ __(
														'(Empty heading)',
														'mark-bricks'
													) }
												</em>
											) : (
												getTextContent(
													create( {
														html: item.content,
													} )
												)
											) }
											{ isIncorrectLevel && (
												<>
													<br />
													<em>
														{ __(
															'(Incorrect heading level)',
															'mark-bricks'
														) }
													</em>
												</>
											) }
											{ item.level === 1 &&
												hasMultipleH1 && (
													<>
														<br />
														<em>
															{ __(
																'(Multiple H1 headings are not recommended)',
																'mark-bricks'
															) }
														</em>
													</>
												) }
										</span>
									</Stack>
								</Stack>
							);
						} ) }
					</ul>
				</div>
			) }
		</div>
	);
}
