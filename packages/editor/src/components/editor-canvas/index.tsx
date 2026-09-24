/**
 * External dependencies
 */
import { useMemo } from 'react';

/**
 * WordPress dependencies
 */

import {
	BlockList,
	// @ts-expect-error -- `privateApis` is not declared in the type definitions.
	privateApis as blockEditorPrivateApis,
} from '@wordpress/block-editor';
import { useMergeRefs } from '@wordpress/compose';
import { ThemeProvider } from '@wordpress/theme';

/**
 * Internal dependencies
 */
import {
	useCanvasSpellCheck,
	useCanvasStyleRuntime,
	usePaddingAppender,
} from '../editor-shell/hooks';
import { FrontMatterEditor } from '../front-matter-editor';
import { unlock } from '../../lock-unlock';
import { useEditorTheme } from '../editor-theme-provider';

const { ExperimentalBlockCanvas } = unlock( blockEditorPrivateApis );

type Props = {
	styles: Array< { css: string } >;
	spellCheck: boolean;
};

export function EditorCanvas( { styles, spellCheck }: Props ) {
	const theme = useEditorTheme();
	const canvasStyles = useMemo(
		() => [ ...styles, { css: `:root { color-scheme: ${ theme }; }` } ],
		[ styles, theme ]
	);
	const contentRef = useMergeRefs( [
		usePaddingAppender( true ),
		useCanvasSpellCheck( spellCheck ),
		useCanvasStyleRuntime(),
	] );
	return (
		<ExperimentalBlockCanvas
			height="100%"
			styles={ canvasStyles }
			contentRef={ contentRef }
		>
			<ThemeProvider isRoot>
				<FrontMatterEditor />
				<BlockList />
			</ThemeProvider>
		</ExperimentalBlockCanvas>
	);
}
