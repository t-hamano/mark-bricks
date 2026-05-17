/**
 * External dependencies
 */
import type { ReactElement } from 'react';

/**
 * WordPress dependencies
 */
import {
	BlockControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { ToolbarDropdownMenu } from '@wordpress/components';
import { Stack } from '@wordpress/ui';
import { __ } from '@wordpress/i18n';
import { comment } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import type { BlockEditProps } from '../types';
import type { AlertType, BlockAttributes } from './types';

const TEMPLATE = [ [ 'core/paragraph' ] ];
const DEFAULT_BLOCK = { name: 'core/paragraph' };

type Alert = {
	slug: AlertType;
	label: string;
	color: string;
	icon: ReactElement;
};

const ALERTS: Alert[] = [
	{
		slug: 'note',
		label: __( 'Note', 'mark-bricks' ),
		color: '#0969da',
		icon: (
			<svg
				viewBox="0 0 24 24"
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path d="M 4 12a 8 8 0 1 1 16 0A 8 8 0 0 1 4 12Zm 8-6.5a 6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM 10.5 11.75A .75 .75 0 0 1 11.25 11h 1a .75 .75 0 0 1 .75 .75v 2.75h .25a .75 .75 0 0 1 0 1.5h-2a .75 .75 0 0 1 0-1.5h .25v-2h-.25a .75 .75 0 0 1-.75-.75ZM 12 10a 1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
			</svg>
		),
	},
	{
		slug: 'tip',
		label: __( 'Tip', 'mark-bricks' ),
		color: '#1a7f37',
		icon: (
			<svg
				viewBox="0 0 24 24"
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path d="M 12 5.5c-2.363 0-4 1.69-4 3.75 0 .984 .424 1.625 .984 2.304l .214 .253c .223 .264 .47 .556 .673 .848 .284 .411 .537 .896 .621 1.49a .75 .75 0 0 1-1.484 .211c-.04-.282-.163-.547-.37-.847a 8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C 7.201 11.75 6.5 10.766 6.5 9.25 6.5 6.31 8.863 4 12 4s 5.5 2.31 5.5 5.25c 0 1.516-.701 2.5-1.328 3.259-.095 .115-.184 .22-.268 .319-.207 .245-.383 .453-.541 .681-.208 .3-.33 .565-.37 .847a .751 .751 0 0 1-1.485-.212c .084-.593 .337-1.078 .621-1.489 .203-.292 .45-.584 .673-.848 .075-.088 .147-.173 .213-.253 .561-.679 .985-1.32 .985-2.304 0-2.06-1.637-3.75-4-3.75ZM 9.75 16h 4.5a .75 .75 0 0 1 0 1.5h-4.5a .75 .75 0 0 1 0-1.5ZM 10 19.25a .75 .75 0 0 1 .75-.75h 2.5a .75 .75 0 0 1 0 1.5h-2.5a .75 .75 0 0 1-.75-.75Z" />
			</svg>
		),
	},
	{
		slug: 'important',
		label: __( 'Important', 'mark-bricks' ),
		color: '#8250df',
		icon: (
			<svg
				viewBox="0 0 24 24"
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path d="M 4 5.75C 4 4.784 4.784 4 5.75 4h 12.5C 19.216 4 20 4.784 20 5.75v 9.5A 1.75 1.75 0 0 1 18.25 17H 12.06l-2.573 2.573A 1.458 1.458 0 0 1 7 18.543V 17H 5.75A 1.75 1.75 0 0 1 4 15.25Zm 1.75-.25a .25 .25 0 0 0-.25 .25v 9.5c 0 .138 .112 .25 .25 .25h 2a .75 .75 0 0 1 .75 .75v 2.19l 2.72-2.72a .749 .749 0 0 1 .53-.22h 6.5a .25 .25 0 0 0 .25-.25v-9.5a .25 .25 0 0 0-.25-.25Zm 7 2.25v 2.5a .75 .75 0 0 1-1.5 0v-2.5a .75 .75 0 0 1 1.5 0ZM 13 13a 1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
			</svg>
		),
	},
	{
		slug: 'warning',
		label: __( 'Warning', 'mark-bricks' ),
		color: '#9a6700',
		icon: (
			<svg
				viewBox="0 0 24 24"
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path d="M 10.457 5.047c .659-1.234 2.427-1.234 3.086 0l 6.082 11.378A 1.75 1.75 0 0 1 18.082 19H 5.918a 1.75 1.75 0 0 1-1.543-2.575Zm 1.763 .707a .25 .25 0 0 0-.44 0L 5.698 17.132a .25 .25 0 0 0 .22 .368h 12.164a .25 .25 0 0 0 .22-.368Zm .53 3.996v 2.5a .75 .75 0 0 1-1.5 0v-2.5a .75 .75 0 0 1 1.5 0ZM 13 15a 1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
			</svg>
		),
	},
	{
		slug: 'caution',
		label: __( 'Caution', 'mark-bricks' ),
		color: '#d1242f',
		icon: (
			<svg
				viewBox="0 0 24 24"
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path d="M 8.47 4.22A .749 .749 0 0 1 9 4h 6c .199 0 .389 .079 .53 .22l 4.25 4.25c .141 .14 .22 .331 .22 .53v 6a .749 .749 0 0 1-.22 .53l-4.25 4.25A .749 .749 0 0 1 15 20H 9a .749 .749 0 0 1-.53-.22L 4.22 15.53A .749 .749 0 0 1 4 15V 9c 0-.199 .079-.389 .22-.53Zm .84 1.28L 5.5 9.31v 5.38l 3.81 3.81h 5.38l 3.81-3.81V 9.31L 14.69 5.5ZM 12 8a .75 .75 0 0 1 .75 .75v 3.5a .75 .75 0 0 1-1.5 0v-3.5A .75 .75 0 0 1 12 8Zm 0 8a 1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
			</svg>
		),
	},
];

export default function Edit( {
	attributes,
	setAttributes,
}: BlockEditProps< BlockAttributes > ) {
	const { markdownData } = attributes;
	const alertType = markdownData?.alertType;
	const activeAlert = alertType
		? ALERTS.find( ( alert ) => alert.slug === alertType )
		: undefined;

	const blockProps = useBlockProps( {
		style: activeAlert ? { borderLeftColor: activeAlert.color } : undefined,
	} );
	const { children, ...innerBlocksProps } = useInnerBlocksProps( blockProps, {
		defaultBlock: DEFAULT_BLOCK,
		directInsert: true,
		templateLock: false,
		// @ts-expect-error @types enforces a stricter template tuple than runtime accepts.
		template: TEMPLATE,
	} );

	const setAlertType = ( type: AlertType | undefined ) =>
		setAttributes( {
			markdownData: type
				? { ...markdownData, alertType: type }
				: undefined,
		} );

	return (
		<>
			<BlockControls group="block">
				<ToolbarDropdownMenu
					icon={ activeAlert ? activeAlert.icon : comment }
					label={ __( 'GitHub alert type', 'mark-bricks' ) }
					controls={ [
						{
							title: __( 'Default', 'mark-bricks' ),
							icon: comment,
							isActive: ! activeAlert,
							onClick: () => setAlertType( undefined ),
						},
						...ALERTS.map( ( alert ) => ( {
							title: alert.label,
							icon: alert.icon,
							isActive: alertType === alert.slug,
							onClick: () => setAlertType( alert.slug ),
						} ) ),
					] }
				/>
			</BlockControls>
			<blockquote { ...innerBlocksProps }>
				{ activeAlert && (
					<Stack
						render={ <p className="wp-block-quote__alert-title" /> }
						direction="row"
						align="center"
						gap="sm"
						style={ { color: activeAlert.color } }
					>
						{ activeAlert.icon }
						{ activeAlert.label }
					</Stack>
				) }
				{ children }
			</blockquote>
		</>
	);
}
