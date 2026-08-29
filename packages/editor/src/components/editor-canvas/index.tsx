/**
 * WordPress dependencies
 */

import {
	// @ts-expect-error -- `privateApis` is not declared in the type definitions.
	privateApis as blockEditorPrivateApis,
} from '@wordpress/block-editor';
import { useMergeRefs } from '@wordpress/compose';

/**
 * Internal dependencies
 */
import {
	useCanvasSpellCheck,
	useCanvasStyleRuntime,
	usePaddingAppender,
} from '../editor/hooks';
import { unlock } from '../../lock-unlock';

const { ExperimentalBlockCanvas } = unlock( blockEditorPrivateApis );

type Props = {
	styles: Array< { css: string } >;
	spellCheck: boolean;
};

export function EditorCanvas( { styles, spellCheck }: Props ) {
	const contentRef = useMergeRefs( [
		usePaddingAppender( true ),
		useCanvasSpellCheck( spellCheck ),
		useCanvasStyleRuntime(),
	] );
	return (
		<ExperimentalBlockCanvas
			height="100%"
			styles={ styles }
			contentRef={ contentRef }
		/>
	);
}
