/**
 * External dependencies
 */
import { useCallback, type RefObject } from 'react';

/**
 * WordPress dependencies
 */
import { __unstableMotion as motion } from '@wordpress/components';
import { useReducedMotion, useViewportMatch } from '@wordpress/compose';
import { useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { closeSmall } from '@wordpress/icons';
import { IconButton, Tabs, Tooltip } from '@wordpress/ui';
/**
 * Internal dependencies
 */
import { ListView } from '../list-view';
import { ListViewOutline } from '../list-view-outline';
import { store as editorStore } from '../../store';
import { SIDEBAR_WIDTH, SIDEBAR_TRANSITION } from '../constants';
import './style.scss';

type Props = {
	toggleRef: RefObject< HTMLButtonElement | null >;
};

export function ListViewSidebar( { toggleRef }: Props ) {
	const { setIsListViewOpened } = useDispatch( editorStore );
	const disableMotion = useReducedMotion();
	const transition = disableMotion ? undefined : SIDEBAR_TRANSITION;
	const isMobileViewport = useViewportMatch( 'medium', '<' );
	const openWidth = isMobileViewport ? '100vw' : SIDEBAR_WIDTH;

	const closeListViewSidebar = useCallback( () => {
		setIsListViewOpened( false );
		toggleRef.current?.focus();
	}, [ setIsListViewOpened, toggleRef ] );

	return (
		<motion.aside
			className="list-view-sidebar"
			aria-label={ __( 'Document Overview', 'mark-bricks' ) }
			initial="closed"
			animate="open"
			exit="closed"
			variants={ {
				open: { width: openWidth },
				closed: { width: 0 },
			} }
			transition={ transition }
		>
			<motion.div
				className="list-view-sidebar__inner"
				variants={ {
					open: { x: 0 },
					closed: { x: '-100%' },
				} }
				transition={ transition }
			>
				<IconButton
					className="list-view-sidebar__close-button"
					icon={ closeSmall }
					label={ __( 'Close', 'mark-bricks' ) }
					variant="minimal"
					tone="neutral"
					size="compact"
					positioner={ <Tooltip.Positioner side="bottom" /> }
					onClick={ closeListViewSidebar }
				/>
				<Tabs.Root
					className="list-view-sidebar__tabs"
					defaultValue="list-view"
				>
					<Tabs.List className="list-view-sidebar__tabs-list">
						<Tabs.Tab value="list-view">
							{ __( 'List View', 'mark-bricks' ) }
						</Tabs.Tab>
						<Tabs.Tab value="outline">
							{ __( 'Outline', 'mark-bricks' ) }
						</Tabs.Tab>
					</Tabs.List>
					<Tabs.Panel
						className="list-view-sidebar__tab-panel"
						value="list-view"
						tabIndex={ -1 }
					>
						<ListView />
					</Tabs.Panel>
					<Tabs.Panel
						className="list-view-sidebar__tab-panel"
						value="outline"
						tabIndex={ -1 }
					>
						<ListViewOutline />
					</Tabs.Panel>
				</Tabs.Root>
			</motion.div>
		</motion.aside>
	);
}
