/**
 * External dependencies
 */
import { useCallback, type KeyboardEvent, type RefObject } from 'react';

/**
 * WordPress dependencies
 */
import { __unstableMotion as motion } from '@wordpress/components';
import { useReducedMotion, useViewportMatch } from '@wordpress/compose';
import { useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { closeSmall } from '@wordpress/icons';
import { IconButton, Stack, Text, Tooltip } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { store as editorStore } from '../../store';
import { SIDEBAR_TRANSITION, SIDEBAR_WIDTH } from '../constants';
import './style.scss';

// Wider than the left sidebars, since it holds a conversation.
const AI_SIDEBAR_WIDTH = SIDEBAR_WIDTH + 60;

type Props = {
	toggleRef: RefObject< HTMLButtonElement | null >;
};

export function AiSidebar( { toggleRef }: Props ) {
	const { setIsAiSidebarOpened } = useDispatch( editorStore );
	const disableMotion = useReducedMotion();
	const transition = disableMotion ? undefined : SIDEBAR_TRANSITION;
	const isMobileViewport = useViewportMatch( 'medium', '<' );
	const openWidth = isMobileViewport ? '100%' : AI_SIDEBAR_WIDTH;

	const closeAiSidebar = useCallback( () => {
		setIsAiSidebarOpened( false );
		toggleRef.current?.focus();
	}, [ setIsAiSidebarOpened, toggleRef ] );

	const closeOnEscape = useCallback(
		( event: KeyboardEvent ) => {
			if ( event.key === 'Escape' && ! event.defaultPrevented ) {
				event.preventDefault();
				closeAiSidebar();
			}
		},
		[ closeAiSidebar ]
	);

	return (
		<motion.aside
			className="ai-sidebar"
			aria-label={ __( 'AI Assistant', 'mark-bricks' ) }
			initial="closed"
			animate="open"
			exit="closed"
			variants={ {
				open: { width: openWidth },
				closed: { width: 0 },
			} }
			transition={ transition }
			onKeyDown={ closeOnEscape }
		>
			<Stack
				className="ai-sidebar__inner"
				direction="column"
				render={
					<motion.div
						variants={ {
							open: { x: 0 },
							closed: { x: '100%' },
						} }
						transition={ transition }
					/>
				}
			>
				<Stack
					className="ai-sidebar__header"
					direction="row"
					align="center"
					justify="space-between"
				>
					<Text variant="heading-md" render={ <h2 /> }>
						{ __( 'AI Assistant', 'mark-bricks' ) }
					</Text>
					<IconButton
						icon={ closeSmall }
						label={ __( 'Close', 'mark-bricks' ) }
						variant="minimal"
						tone="neutral"
						size="compact"
						positioner={ <Tooltip.Positioner side="bottom" /> }
						onClick={ closeAiSidebar }
					/>
				</Stack>
				<div className="ai-sidebar__body" />
			</Stack>
		</motion.aside>
	);
}
