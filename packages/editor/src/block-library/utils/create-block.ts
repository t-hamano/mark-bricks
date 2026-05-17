/**
 * External dependencies
 */
import { v4 as uuid } from 'uuid';

/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * Creates a block object with a unique client ID.
 *
 * Unlike `createBlock` from `@wordpress/blocks`, this factory does not depend
 * on the block registry. The WordPress version looks up the registered block
 * type to merge default attributes and validate the name, so it requires the
 * block type to be registered. Markdown/block converters run independently of
 * the registry (e.g. in unit tests where no block types are registered), so a
 * minimal registry-free factory is used here instead.
 *
 * @param name        Block name.
 * @param attributes  Block attributes.
 * @param innerBlocks Nested inner blocks.
 *
 * @return The created block object.
 */
export function createBlock(
	name: string,
	attributes: Record< string, unknown > = {},
	innerBlocks: Block[] = []
): Block {
	return {
		clientId: uuid(),
		name,
		isValid: true,
		attributes,
		innerBlocks,
	};
}
