export const actions = {
	openTab() {
		return { type: 'OPEN_TAB' as const };
	},
	openFileTab( filePath: string, content: string ) {
		return { type: 'OPEN_FILE_TAB' as const, filePath, content };
	},
	closeTab( id: string ) {
		return { type: 'CLOSE_TAB' as const, id };
	},
	setActiveTab( id: string ) {
		return { type: 'SET_ACTIVE_TAB' as const, id };
	},
	setTabDirty( id: string, isDirty: boolean ) {
		return { type: 'SET_TAB_DIRTY' as const, id, isDirty };
	},
	setTabFile( id: string, filePath: string ) {
		return { type: 'SET_TAB_FILE' as const, id, filePath };
	},
	setTabContent( id: string, content: string ) {
		return { type: 'SET_TAB_CONTENT' as const, id, content };
	},
	setPendingCloseId( id: string | null ) {
		return { type: 'SET_PENDING_CLOSE_ID' as const, id };
	},
};

export type Action = ReturnType< ( typeof actions )[ keyof typeof actions ] >;
