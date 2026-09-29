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
	useCanvasRendered,
	useCanvasSpellCheck,
	useCanvasStyleRuntime,
	usePaddingAppender,
} from '../editor-shell/hooks';
import { FrontMatterEditor } from '../front-matter-editor';
import { useInlineImageSources } from '../../format-library/image/use-inline-image-sources';
import { unlock } from '../../lock-unlock';
import { useEditorTheme } from '../editor-theme-provider';
import { useKatexStyles } from '../../katex';

const { ExperimentalBlockCanvas } = unlock( blockEditorPrivateApis );

type Props = {
	styles: Array< { css: string } >;
	spellCheck: boolean;
	onRendered?: ( canvas: HTMLElement ) => void;
};

export function EditorCanvas( { styles, spellCheck, onRendered }: Props ) {
	const theme = useEditorTheme();
	const katexStyles = useKatexStyles();
	const canvasStyles = useMemo(
		() => [
			// First, so that the other styles can override KaTeX's.
			...( katexStyles ? [ { css: katexStyles } ] : [] ),
			...styles,
			{ css: `:root { color-scheme: ${ theme }; }` },
		],
		[ katexStyles, styles, theme ]
	);
	const contentRef = useMergeRefs( [
		usePaddingAppender( true ),
		useCanvasSpellCheck( spellCheck ),
		useCanvasStyleRuntime(),
		useInlineImageSources(),
		useCanvasRendered( onRendered ),
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
