/**
 * External dependencies
 */
import {
	forwardRef,
	lazy,
	Suspense,
	type CSSProperties,
	type ForwardedRef,
	type ReactNode,
} from 'react';

/**
 * Internal dependencies
 */
import { EditorShell, type EditorHandle } from '../editor-shell';
import type { CodeEditorSettings } from '../text-editor';
import type { Platform } from '../../platform';

export type { EditorHandle, CodeEditorSettings };

// Keeps `text-editor` on a dynamic path everywhere, so bundlers can split it
// into its own chunk instead of pulling it into `Editor`/`BlockEditor` too.
const TextEditor = lazy( async () => ( {
	default: ( await import( '../text-editor' ) ).TextEditor,
} ) );

type Props = {
	content: string;
	onChange: ( content: string ) => void;
	settings?: {
		showUndoRedo?: boolean;
		codeEditor?: Partial< CodeEditorSettings >;
	};
	headerActions?: ReactNode;
	style?: CSSProperties;
	platform?: Partial< Platform >;
};

function UnforwardedCodeEditor(
	{ content, onChange, settings, headerActions, style, platform }: Props,
	ref: ForwardedRef< EditorHandle >
) {
	return (
		<EditorShell
			ref={ ref }
			content={ content }
			onChange={ onChange }
			editorMode="text"
			settings={ settings }
			headerActions={ headerActions }
			style={ style }
			platform={ platform }
		>
			<Suspense fallback={ null }>
				<TextEditor
					content={ content }
					onChange={ onChange }
					settings={ settings?.codeEditor }
				/>
			</Suspense>
		</EditorShell>
	);
}

export const CodeEditor = forwardRef( UnforwardedCodeEditor );
