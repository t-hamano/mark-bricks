/**
 * External dependencies
 */
import clsx from 'clsx';
import { useRef, useState, type MouseEvent } from 'react';

/**
 * WordPress dependencies
 */
import {
	Dropdown,
	DropdownMenu,
	MenuGroup,
	MenuItem,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { closeSmall, plus } from '@wordpress/icons';
import { displayShortcut } from '@wordpress/keycodes';
import { IconButton, Stack } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import {
	closeOtherTabs,
	newFile,
	openFile,
	requestCloseTab,
	saveTab,
	saveTabAs,
} from '../../actions';
import tabsStore, { type Tab } from '../../store';
import './style.scss';

export default function Tabbar() {
	const { tabs, activeTabId } = useSelect( ( select ) => {
		const { getTabs, getActiveTabId } = select( tabsStore );
		return {
			tabs: getTabs(),
			activeTabId: getActiveTabId(),
		};
	}, [] );

	const { setActiveTab } = useDispatch( tabsStore );

	const buttonRefs = useRef< Map< string, HTMLButtonElement > >( new Map() );

	const [ contextMenu, setContextMenu ] = useState< {
		id: string;
		x: number;
		y: number;
	} | null >( null );

	const handleClose = ( id: string ) => {
		const tab = tabs.find( ( t ) => t.id === id );

		if ( tab?.isDirty ) {
			requestCloseTab( id );
			return;
		}

		const idx = tabs.findIndex( ( t ) => t.id === id );

		if ( idx !== -1 && tabs.length > 1 ) {
			const nextIdx = idx === 0 ? 1 : idx - 1;
			const nextId = tabs[ nextIdx ].id;
			buttonRefs.current.get( nextId )?.focus();
			setActiveTab( nextId );
		}

		requestCloseTab( id );
	};

	const setButtonRef = ( id: string ) => ( el: HTMLButtonElement | null ) => {
		if ( el ) {
			buttonRefs.current.set( id, el );
		} else {
			buttonRefs.current.delete( id );
		}
	};

	const handleContextMenu = (
		event: MouseEvent< HTMLButtonElement >,
		id: string
	) => {
		event.preventDefault();
		setContextMenu( { id, x: event.clientX, y: event.clientY } );
	};

	const closeContextMenu = () => setContextMenu( null );

	const contextTab = contextMenu
		? tabs.find( ( t ) => t.id === contextMenu.id ) ?? null
		: null;

	const contextAnchor = contextMenu
		? {
				getBoundingClientRect: () =>
					new DOMRect( contextMenu.x, contextMenu.y, 0, 0 ),
		  }
		: null;

	return (
		<Stack className="tabbar">
			<Stack className="tabbar__tabs" align="stretch">
				{ tabs.map( ( tab ) => (
					<TabItem
						key={ tab.id }
						tab={ tab }
						isActive={ tab.id === activeTabId }
						onActivate={ () => setActiveTab( tab.id ) }
						onClose={ () => handleClose( tab.id ) }
						onContextMenu={ ( event ) =>
							handleContextMenu( event, tab.id )
						}
						buttonRef={ setButtonRef( tab.id ) }
					/>
				) ) }
			</Stack>
			<DropdownMenu
				icon={ plus }
				label={ __( 'New…', 'mark-bricks' ) }
				popoverProps={ { placement: 'bottom-end' } }
				toggleProps={ {
					size: 'small',
					iconSize: 16,
					className: 'tabbar__new',
				} }
			>
				{ ( { onClose } ) => (
					<>
						<MenuItem
							shortcut={ displayShortcut.primary( 'n' ) }
							onClick={ () => {
								newFile();
								onClose();
							} }
						>
							{ __( 'New file', 'mark-bricks' ) }
						</MenuItem>
						<MenuItem
							shortcut={ displayShortcut.primary( 'o' ) }
							onClick={ () => {
								openFile();
								onClose();
							} }
						>
							{ __( 'Open file…', 'mark-bricks' ) }
						</MenuItem>
					</>
				) }
			</DropdownMenu>
			{ contextMenu && contextTab && (
				<Dropdown
					open
					onToggle={ ( willOpen ) => {
						if ( ! willOpen ) {
							closeContextMenu();
						}
					} }
					popoverProps={ {
						anchor: contextAnchor,
						placement: 'bottom-start',
					} }
					renderToggle={ () => null }
					renderContent={ () => (
						<>
							<MenuGroup>
								<MenuItem
									shortcut={ displayShortcut.primary( 'w' ) }
									onClick={ () => {
										handleClose( contextMenu.id );
										closeContextMenu();
									} }
								>
									{ __( 'Close', 'mark-bricks' ) }
								</MenuItem>
								<MenuItem
									disabled={ tabs.length <= 1 }
									onClick={ () => {
										closeOtherTabs( contextMenu.id );
										closeContextMenu();
									} }
								>
									{ __( 'Close other tabs', 'mark-bricks' ) }
								</MenuItem>
							</MenuGroup>
							<MenuGroup>
								<MenuItem
									shortcut={ displayShortcut.primary( 's' ) }
									onClick={ () => {
										saveTab( contextMenu.id );
										closeContextMenu();
									} }
								>
									{ __( 'Save', 'mark-bricks' ) }
								</MenuItem>
								<MenuItem
									shortcut={ displayShortcut.primaryShift(
										's'
									) }
									onClick={ () => {
										saveTabAs( contextMenu.id );
										closeContextMenu();
									} }
								>
									{ __( 'Save as…', 'mark-bricks' ) }
								</MenuItem>
							</MenuGroup>
						</>
					) }
				/>
			) }
		</Stack>
	);
}

type TabItemProps = {
	tab: Tab;
	isActive: boolean;
	onActivate: () => void;
	onClose: () => void;
	onContextMenu: ( event: MouseEvent< HTMLButtonElement > ) => void;
	buttonRef: ( el: HTMLButtonElement | null ) => void;
};

function TabItem( {
	tab,
	isActive,
	onActivate,
	onClose,
	onContextMenu,
	buttonRef,
}: TabItemProps ) {
	const handleAuxClick = ( event: MouseEvent< HTMLButtonElement > ) => {
		if ( event.button === 1 ) {
			event.preventDefault();
			onClose();
		}
	};

	return (
		<div className="tabbar__tab">
			<button
				ref={ buttonRef }
				className={ clsx( 'tabbar__activate', {
					'is-active': isActive,
					'is-dirty': tab.isDirty,
				} ) }
				aria-current={ isActive ? 'page' : undefined }
				onClick={ onActivate }
				onAuxClick={ handleAuxClick }
				onContextMenu={ onContextMenu }
			>
				<span className="tabbar__title">{ tab.title }</span>
				<span
					className={ clsx( 'tabbar__dirty', {
						'is-dirty': tab.isDirty,
					} ) }
					aria-label={
						tab.isDirty
							? __( 'Unsaved changes', 'mark-bricks' )
							: undefined
					}
					aria-hidden={ ! tab.isDirty }
				></span>
			</button>
			<IconButton
				icon={ closeSmall }
				variant="minimal"
				tone="neutral"
				size="small"
				label={ sprintf(
					/* translators: %s: tab title. */
					__( 'Close %s', 'mark-bricks' ),
					tab.title
				) }
				onClick={ onClose }
				className="tabbar__close"
			/>
		</div>
	);
}
