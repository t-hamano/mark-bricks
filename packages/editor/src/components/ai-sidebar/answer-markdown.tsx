/**
 * External dependencies
 */
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * WordPress dependencies
 */
import { Link, Text } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { usePlatform } from '../../platform';

const remarkPlugins = [ remarkGfm ];

/**
 * Shows the text of an assistant answer with its Markdown formatting, such
 * as bold text, lists, and code.
 *
 * The Markdown becomes React elements, never HTML strings. HTML written in
 * the answer is not rendered, and links with unsafe URLs, such as
 * `javascript:`, lose their URL. Partial Markdown while the answer streams
 * in, such as an unclosed `**`, shows as it is written until it is closed.
 *
 * @param props          Component props.
 * @param props.children The Markdown text of the answer.
 */
export function AnswerMarkdown( { children }: { children: string } ) {
	const { openUrl } = usePlatform();

	const components: Components = {
		a: ( { href, children: linkChildren } ) =>
			href ? (
				<Link
					href={ href }
					openInNewTab
					onClick={
						openUrl
							? ( event ) => {
									event.preventDefault();
									openUrl( href );
								}
							: undefined
					}
				>
					{ linkChildren }
				</Link>
			) : (
				<>{ linkChildren }</>
			),
		// An answer could point an image at any URL, which would load as soon
		// as it shows. Only the alt text is shown.
		img: ( { alt } ) => <>{ alt }</>,
	};

	return (
		<Text className="ai-chat__markdown" render={ <div /> }>
			<Markdown remarkPlugins={ remarkPlugins } components={ components }>
				{ children }
			</Markdown>
		</Text>
	);
}
