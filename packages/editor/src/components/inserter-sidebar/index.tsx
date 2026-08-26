/**
 * External dependencies
 */
import clsx from 'clsx';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
	type RefObject,
} from 'react';

/**
 * WordPress dependencies
 */
import { useSelect, useDispatch } from '@wordpress/data';
import {
	store as blockEditorStore,
	BlockIcon,
	type EditorInserterItem,
} from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import {
	__unstableMotion as motion,
	SearchControl,
} from '@wordpress/components';
import { useReducedMotion, useViewportMatch } from '@wordpress/compose';
import { __ } from '@wordpress/i18n';
import { closeSmall } from '@wordpress/icons';
import { IconButton, Stack, Text, Tooltip } from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { store as editorStore } from '../../store';
import { SIDEBAR_WIDTH, SIDEBAR_TRANSITION } from '../constants';
import './style.scss';

type Props = {
	toggleRef: RefObject< HTMLButtonElement | null >;
};

export function InserterSidebar( { toggleRef }: Props ) {
	const { setIsInserterOpened } = useDispatch( editorStore );
	const { insertBlock } = useDispatch( blockEditorStore );
	const items = useSelect(
		( select ) => select( blockEditorStore ).getInserterItems(),
		[]
	);
	const [ search, setSearch ] = useState( '' );
	const [ isScrolled, setIsScrolled ] = useState( false );
	const searchRef = useRef< HTMLInputElement >( null );
	const blockListRef = useRef< HTMLUListElement >( null );
	const disableMotion = useReducedMotion();
	const transition = disableMotion ? undefined : SIDEBAR_TRANSITION;
	const isMobileViewport = useViewportMatch( 'medium', '<' );
	const openWidth = isMobileViewport ? '100vw' : SIDEBAR_WIDTH;

	useEffect( () => {
		searchRef.current?.focus();
	}, [] );

	useEffect( () => {
		const el = blockListRef.current;
		if ( ! el ) {
			return;
		}
		const update = () => setIsScrolled( el.scrollTop > 0 );
		update();
		el.addEventListener( 'scroll', update, { passive: true } );
		return () => el.removeEventListener( 'scroll', update );
	}, [] );

	const filtered = useMemo( () => {
		const q = search.trim().toLowerCase();
		if ( ! q ) {
			return items;
		}
		return items.filter(
			( item ) =>
				item.title.toLowerCase().includes( q ) ||
				item.keywords.some( ( k ) => k.toLowerCase().includes( q ) )
		);
	}, [ items, search ] );

	const closeInserterSidebar = useCallback( () => {
		setIsInserterOpened( false );
		toggleRef.current?.focus();
	}, [ setIsInserterOpened, toggleRef ] );

	const closeOnEscape = useCallback(
		( event: KeyboardEvent ) => {
			if ( event.key === 'Escape' && ! event.defaultPrevented ) {
				event.preventDefault();
				closeInserterSidebar();
			}
		},
		[ closeInserterSidebar ]
	);

	const onSelectItem = useCallback(
		( item: EditorInserterItem ) => {
			insertBlock( createBlock( item.name, item.initialAttributes ) );
		},
		[ insertBlock ]
	);

	return (
		<Stack
			render={
				<motion.div
					initial="closed"
					animate="open"
					exit="closed"
					variants={ {
						open: { width: openWidth },
						closed: { width: 0 },
					} }
					transition={ transition }
					onKeyDown={ closeOnEscape }
				/>
			}
			className="inserter-sidebar"
			direction="column"
		>
			<Stack
				className="inserter-sidebar__inner"
				direction="column"
				render={
					<motion.div
						variants={ {
							open: { x: 0 },
							closed: { x: '-100%' },
						} }
						transition={ transition }
					/>
				}
			>
				<Stack
					className={ clsx( 'inserter-sidebar__search', {
						'is-scrolled': isScrolled,
					} ) }
					direction="row"
					align="center"
					gap="sm"
				>
					<SearchControl
						ref={ searchRef }
						className="inserter-sidebar__search-control"
						label={ __( 'Search for blocks', 'mark-bricks' ) }
						placeholder={ __( 'Search', 'mark-bricks' ) }
						value={ search }
						onChange={ setSearch }
						size="compact"
					/>
					<IconButton
						icon={ closeSmall }
						label={ __( 'Close', 'mark-bricks' ) }
						variant="minimal"
						tone="neutral"
						size="compact"
						positioner={ <Tooltip.Positioner side="bottom" /> }
						onClick={ closeInserterSidebar }
					/>
				</Stack>
				<ul
					ref={ blockListRef }
					className="inserter-sidebar__block-list"
				>
					{ filtered.map( ( item ) => (
						<li
							key={ item.id }
							className="inserter-sidebar__block-list-item"
						>
							<Stack
								render={
									<button
										type="button"
										onClick={ () => onSelectItem( item ) }
									/>
								}
								className="inserter-sidebar__block-list-button"
								direction="column"
								align="center"
								justify="center"
								gap="xs"
							>
								<BlockIcon icon={ item.icon as never } />
								<Text variant="body-sm">{ item.title }</Text>
							</Stack>
						</li>
					) ) }
				</ul>
			</Stack>
		</Stack>
	);
}
