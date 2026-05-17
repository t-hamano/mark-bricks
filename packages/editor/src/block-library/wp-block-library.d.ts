declare module '@wordpress/block-library/build-module/*' {
	import type { BlockConfiguration } from '@wordpress/blocks';

	export const name: string;
	export const metadata: BlockConfiguration;
	export const settings: BlockConfiguration;
	export const init: () => unknown;
}
