/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { Badge } from '@wordpress/ui';

/**
 * Tells that the document is a Marp slide deck. The host decides when to
 * show it.
 */
export function MarpModeBadge() {
	return <Badge intent="high">{ __( 'Marp Mode', 'mark-bricks' ) }</Badge>;
}
