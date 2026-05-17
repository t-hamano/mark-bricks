/**
 * WordPress dependencies
 */
import type { Block } from '@wordpress/blocks';

/**
 * GitHub Flavored Markdown alert kinds.
 *
 * A GFM alert is a block quote whose first line is a bare marker — one of
 * `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`. The marker
 * is matched case-insensitively but always serialized in upper case.
 */
export type AlertType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

export type BlockAttributes = Block[ 'attributes' ] & {
	citation?: string;
	markdownData?: {
		alertType?: AlertType;
	};
};
