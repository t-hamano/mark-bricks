/**
 * External dependencies
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks';

/**
 * WordPress dependencies
 */
import { dispatch, select } from '@wordpress/data';

/**
 * Internal dependencies
 */
import tabsStore from '../store';
import { openFilePath, saveTab } from '.';

afterEach( () => {
	clearMocks();
} );

/**
 * Returns the open tab for `path`, failing the test if none is open. Tests share
 * the registered store, so they key off unique file paths to stay independent.
 *
 * @param path File path the tab was opened from.
 */
function requireTab( path: string ) {
	const tab = select( tabsStore )
		.getTabs()
		.find( ( t ) => t.filePath === path );
	if ( ! tab ) {
		throw new Error( `expected an open tab for ${ path }` );
	}
	return tab;
}

describe( 'openFilePath', () => {
	it( 'reads the file and opens it as the active tab', async () => {
		mockIPC( ( cmd ) => {
			if ( cmd === 'read_text_file' ) {
				return '# Hello\n';
			}
		} );

		await openFilePath( '/docs/open-new.md' );

		const tab = requireTab( '/docs/open-new.md' );
		expect( tab.content ).toBe( '# Hello\n' );
		expect( tab.title ).toBe( 'open-new.md' );
		expect( tab.isDirty ).toBe( false );
		expect( select( tabsStore ).getActiveTabId() ).toBe( tab.id );
	} );

	it( 'focuses an already-open file instead of reading it again', async () => {
		const read = vi.fn( () => 'body' );
		mockIPC( ( cmd ) => {
			if ( cmd === 'read_text_file' ) {
				return read();
			}
		} );

		await openFilePath( '/docs/reopen.md' );
		// Move focus to another file, then ask for the first one again.
		await openFilePath( '/docs/reopen-other.md' );
		await openFilePath( '/docs/reopen.md' );

		// Only the two distinct files were read; the repeat open reused the tab.
		expect( read ).toHaveBeenCalledTimes( 2 );
		expect( select( tabsStore ).getActiveTabId() ).toBe(
			requireTab( '/docs/reopen.md' ).id
		);
	} );
} );

describe( 'saveTab', () => {
	it( 'writes the content to the tab path and clears the dirty flag', async () => {
		const writes: unknown[] = [];
		mockIPC( ( cmd, payload ) => {
			if ( cmd === 'read_text_file' ) {
				return 'original';
			}
			if ( cmd === 'write_text_file' ) {
				writes.push( payload );
				return null;
			}
		} );

		await openFilePath( '/docs/save.md' );
		const id = requireTab( '/docs/save.md' ).id;
		dispatch( tabsStore ).setTabContent( id, 'edited body' );
		dispatch( tabsStore ).setTabDirty( id, true );

		const result = await saveTab( id );

		expect( result ).toBe( true );
		expect( writes ).toEqual( [
			{ path: '/docs/save.md', contents: 'edited body' },
		] );
		expect( requireTab( '/docs/save.md' ).isDirty ).toBe( false );
	} );
} );
