export const actions = {
	setIsListViewOpened( isOpened: boolean ) {
		return { type: 'SET_IS_LIST_VIEW_OPENED' as const, isOpened };
	},
	setIsInserterOpened( isOpened: boolean ) {
		return { type: 'SET_IS_INSERTER_OPENED' as const, isOpened };
	},
};

export type Action = ReturnType< ( typeof actions )[ keyof typeof actions ] >;
