declare module '@wordpress/interface' {
	import type { StoreDescriptor } from '@wordpress/data';

	export const store: StoreDescriptor< {
		reducer: ( state: unknown, action: unknown ) => unknown;
		actions: {
			openModal: ( name: string ) => { type: string; name: string };
			closeModal: () => { type: string };
		};
		selectors: {
			isModalActive: ( state: unknown, modalName: string ) => boolean;
		};
	} >;
}
