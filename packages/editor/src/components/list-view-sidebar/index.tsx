/**
 * External dependencies
 */
import { useCallback, type RefObject } from 'react';

/**
 * WordPress dependencies
 */
import {
	__unstableMotion as motion,
	TabPanel,
	Button,
} from '@wordpress/components';
import { useReducedMotion, useViewportMatch } from '@wordpress/compose';
import { useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { closeSmall } from '@wordpress/icons';
import { Stack } from '@wordpress/ui';
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
				<Button
					className="list-view-sidebar__close-button"
					icon={ closeSmall }
					label={ __( 'Close', 'mark-bricks' ) }
					size="small"
					onClick={ closeListViewSidebar }
					accessibleWhenDisabled
				/>
				<TabPanel
					className="list-view-sidebar__tab-panel"
					tabs={ [
						{
							name: 'list-view',
							title: __( 'List View', 'mark-bricks' ),
							className: 'list-view-sidebar__tabs-item',
						},
						{
							name: 'outline',
							title: __( 'Outline', 'mark-bricks' ),
							className: 'list-view-sidebar__tabs-item',
						},
					] }
					initialTabName="list-view"
				>
					{ ( tab ) => (
						<Stack
							className="list-view-sidebar__tab-panel-container"
							direction="column"
						>
							{ tab.name === 'list-view' ? (
								<ListView />
							) : (
								<ListViewOutline />
							) }
						</Stack>
					) }
				</TabPanel>
			</motion.div>
		</motion.aside>
	);
}
