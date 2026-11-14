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
	type UIEvent,
} from 'react';

/**
 * WordPress dependencies
 */
import { useSelect, useDispatch, useRegistry } from '@wordpress/data';
import {
	store as blockEditorStore,
	BlockIcon,
	type EditorInserterItem,
} from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import { __unstableMotion as motion, Composite } from '@wordpress/components';
import { useReducedMotion, useViewportMatch } from '@wordpress/compose';
import { __ } from '@wordpress/i18n';
import { closeSmall, search as searchIcon } from '@wordpress/icons';
import {
	Button,
	Icon,
	IconButton,
	InputControl,
	InputLayout,
	Stack,
	Tabs,
	Text,
	Tooltip,
} from '@wordpress/ui';

/**
 * Internal dependencies
 */
import { isMarpFrontMatter } from '../../converter/front-matter';
import { useFrontMatter } from '../front-matter-editor/context';
import { store as editorStore } from '../../store';
import { SIDEBAR_WIDTH, SIDEBAR_TRANSITION } from '../constants';
import { SlidePatternList } from './slide-pattern-list';
import {
	getInsertionTarget,
	useInsertionPointPreview,
} from './insertion-target';
import './style.scss';

const BLOCKS_PER_ROW = 2;

type Tab = 'blocks' | 'patterns';

function chunk< T >( items: T[], size: number ) {
	const rows: T[][] = [];
	for ( let i = 0; i < items.length; i += size ) {
		rows.push( items.slice( i, i + size ) );
	}
	return rows;
}

type Props = {
	toggleRef: RefObject< HTMLButtonElement | null >;
};

export function InserterSidebar( { toggleRef }: Props ) {
	const { setIsInserterOpened } = useDispatch( editorStore );
	const { insertBlock, replaceBlock } = useDispatch( blockEditorStore );
	const registry = useRegistry();
	const preview = useInsertionPointPreview();
	const items = useSelect(
		( select ) => select( blockEditorStore ).getInserterItems(),
		[]
	);
	const [ search, setSearch ] = useState( '' );
	const [ isScrolled, setIsScrolled ] = useState( false );
	const [ tab, setTab ] = useState< Tab >( 'blocks' );
	const searchRef = useRef< HTMLInputElement >( null );
	const { frontMatter } = useFrontMatter();
	// Slide patterns are offered only for Marp decks.
	const isMarp = isMarpFrontMatter( frontMatter );
	const activeTab: Tab = isMarp ? tab : 'blocks';
	const disableMotion = useReducedMotion();
	const transition = disableMotion ? undefined : SIDEBAR_TRANSITION;
	const isMobileViewport = useViewportMatch( 'medium', '<' );
	const openWidth = isMobileViewport ? '100%' : SIDEBAR_WIDTH;

	useEffect( () => {
		searchRef.current?.focus();
	}, [] );

	const onListScroll = useCallback( ( event: UIEvent< HTMLDivElement > ) => {
		setIsScrolled( event.currentTarget.scrollTop > 0 );
	}, [] );

	// Each tab's list starts at its top.
	useEffect( () => {
		setIsScrolled( false );
	}, [ activeTab ] );

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

	const rows = useMemo(
		() => chunk( filtered, BLOCKS_PER_ROW ),
		[ filtered ]
	);

	const closeInserterSidebar = useCallback( () => {
		setIsInserterOpened( false );
		toggleRef.current?.focus();
	}, [ setIsInserterOpened, toggleRef ] );

	const closeOnEscape = useCallback(
		( event: KeyboardEvent ) => {
			// Leaves Escape in the slide pattern modal to the modal: its
			// events bubble here through the portal.
			if (
				event.key === 'Escape' &&
				! event.defaultPrevented &&
				event.currentTarget.contains( event.target as Node )
			) {
				event.preventDefault();
				closeInserterSidebar();
			}
		},
		[ closeInserterSidebar ]
	);

	const clearSearch = useCallback( () => {
		setSearch( '' );
		searchRef.current?.focus();
	}, [] );

	const onSelectItem = useCallback(
		( item: EditorInserterItem ) => {
			const block = createBlock( item.name, item.initialAttributes );
			const { index, replaceClientId } = getInsertionTarget( registry );
			if ( replaceClientId ) {
				replaceBlock( replaceClientId, block );
			} else {
				insertBlock( block, index, '' );
			}
			preview.hide();
		},
		[ insertBlock, replaceBlock, registry, preview ]
	);

	const blockList = (
		<Composite
			className="inserter-sidebar__block-list"
			role="listbox"
			aria-label={ __( 'Blocks', 'mark-bricks' ) }
			onScroll={ onListScroll }
			focusLoop
			focusShift
			focusWrap
		>
			{ rows.map( ( row, rowIndex ) => (
				<Composite.Row
					key={ rowIndex }
					role="presentation"
					className="inserter-sidebar__block-list-row"
				>
					{ row.map( ( item ) => (
						<Composite.Item
							key={ item.id }
							role="option"
							className="inserter-sidebar__block-list-item"
							onClick={ () => onSelectItem( item ) }
							onMouseEnter={ preview.show }
							onMouseLeave={ preview.hide }
							onFocus={ preview.show }
							onBlur={ preview.hide }
							render={
								<Button variant="minimal" tone="neutral" />
							}
						>
							<BlockIcon icon={ item.icon as never } />
							<Text variant="body-sm">{ item.title }</Text>
						</Composite.Item>
					) ) }
				</Composite.Row>
			) ) }
		</Composite>
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
					<InputControl
						ref={ searchRef }
						className="inserter-sidebar__search-control"
						label={
							activeTab === 'patterns'
								? __(
										'Search for slide patterns',
										'mark-bricks'
									)
								: __( 'Search for blocks', 'mark-bricks' )
						}
						hideLabelFromVision
						type="search"
						size="compact"
						placeholder={ __( 'Search', 'mark-bricks' ) }
						value={ search }
						onValueChange={ setSearch }
						prefix={
							<InputLayout.Slot>
								<Icon icon={ searchIcon } />
							</InputLayout.Slot>
						}
						suffix={
							search ? (
								<InputLayout.Slot padding="minimal">
									<IconButton
										icon={ closeSmall }
										label={ __(
											'Reset search',
											'mark-bricks'
										) }
										variant="minimal"
										tone="neutral"
										size="small"
										onClick={ clearSearch }
									/>
								</InputLayout.Slot>
							) : undefined
						}
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
				{ isMarp ? (
					<Tabs.Root
						className="inserter-sidebar__tabs"
						value={ activeTab }
						onValueChange={ ( value ) => setTab( value as Tab ) }
					>
						<Tabs.List className="inserter-sidebar__tabs-list">
							<Tabs.Tab value="blocks">
								{ __( 'Blocks', 'mark-bricks' ) }
							</Tabs.Tab>
							<Tabs.Tab value="patterns">
								{ __( 'Slide patterns', 'mark-bricks' ) }
							</Tabs.Tab>
						</Tabs.List>
						<Tabs.Panel
							className="inserter-sidebar__tab-panel"
							value="blocks"
							tabIndex={ -1 }
						>
							{ blockList }
						</Tabs.Panel>
						<Tabs.Panel
							className="inserter-sidebar__tab-panel"
							value="patterns"
							tabIndex={ -1 }
						>
							<SlidePatternList
								search={ search }
								onScroll={ onListScroll }
							/>
						</Tabs.Panel>
					</Tabs.Root>
				) : (
					blockList
				) }
			</Stack>
		</Stack>
	);
}
