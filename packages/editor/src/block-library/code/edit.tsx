/**
 * External dependencies
 */
import { languages } from '@codemirror/language-data';

/**
 * WordPress dependencies
 */
import {
	BlockControls,
	useBlockProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Dropdown, ToolbarButton } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { RichTextData } from '@wordpress/rich-text';
import { __ } from '@wordpress/i18n';
import { language as languageIcon } from '@wordpress/icons';
import { Autocomplete, Field, Input } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import type { BlockEditProps } from '../types';
import type { BlockAttributes } from './types';
import { useCodeMirror } from '../hooks/use-code-mirror';

const LANGUAGE_SUGGESTIONS = Array.from(
	new Set(
		languages
			.flatMap( ( lang ) => [ lang.name, ...lang.alias ] )
			.map( ( name ) => name.toLowerCase() )
	)
).sort( ( a, b ) => a.localeCompare( b ) );

export default function Edit( {
	attributes,
	setAttributes,
	clientId,
	insertBlocksAfter,
}: BlockEditProps< BlockAttributes > ) {
	const { content, markdownData } = attributes;
	const { language = '' } = markdownData ?? {};
	const text =
		content instanceof RichTextData ? content.toPlainText() : content ?? '';

	const { previousBlockClientId, nextBlockClientId } = useSelect(
		( select ) => {
			const store = select( blockEditorStore );
			return {
				previousBlockClientId:
					store.getPreviousBlockClientId( clientId ),
				nextBlockClientId: store.getNextBlockClientId( clientId ),
			};
		},
		[ clientId ]
	);

	const { selectBlock } = useDispatch( blockEditorStore );

	const containerRef = useCodeMirror( {
		text,
		language,
		placeholder: __( 'Write code…', 'mark-bricks' ),
		handlers: {
			previousBlockClientId,
			nextBlockClientId,
			insertBlocksAfter,
			selectBlock,
			onChange: ( nextText ) =>
				setAttributes( {
					content: RichTextData.fromPlainText( nextText ),
				} ),
		},
	} );

	const blockProps = useBlockProps( {
		ref: containerRef,
		'data-language': language || undefined,
	} );

	return (
		<>
			<BlockControls group="block">
				<Dropdown
					popoverProps={ { placement: 'bottom-start' } }
					renderToggle={ ( { isOpen, onToggle } ) => (
						<ToolbarButton
							icon={ languageIcon }
							title={ __( 'Change language', 'mark-bricks' ) }
							onClick={ onToggle }
							aria-expanded={ isOpen }
							aria-haspopup="true"
						/>
					) }
					renderContent={ ( { onClose } ) => (
						<form
							onSubmit={ ( event ) => {
								event.preventDefault();
								onClose();
							} }
						>
							<Field.Root>
								<Field.Label>
									{ __( 'Language', 'mark-bricks' ) }
								</Field.Label>
								<Autocomplete.Root
									items={ LANGUAGE_SUGGESTIONS }
									value={ language }
									onValueChange={ ( nextValue ) =>
										setAttributes( {
											markdownData: {
												...markdownData,
												language: nextValue,
											},
										} )
									}
									openOnInputClick
								>
									<Autocomplete.Input
										maxLength={ 50 }
										placeholder={ __(
											'Choose language…',
											'mark-bricks'
										) }
										render={ <Input size="compact" /> }
										style={ { width: '200px' } }
									/>
									<Autocomplete.Popup>
										<Autocomplete.Empty>
											{ __(
												'No matching language.',
												'mark-bricks'
											) }
										</Autocomplete.Empty>
										<Autocomplete.List>
											<Autocomplete.ListBody>
												<Autocomplete.Collection>
													{ ( name: string ) => (
														<Autocomplete.Item
															key={ name }
															value={ name }
														>
															{ name }
														</Autocomplete.Item>
													) }
												</Autocomplete.Collection>
											</Autocomplete.ListBody>
										</Autocomplete.List>
									</Autocomplete.Popup>
								</Autocomplete.Root>
							</Field.Root>
						</form>
					) }
				/>
			</BlockControls>
			<div { ...blockProps } />
		</>
	);
}
