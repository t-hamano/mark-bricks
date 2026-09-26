/**
 * The attribute that carries a non-default marker through a block's inline
 * content. `*` is the default and is therefore never written out.
 */
export const MARKER_ATTRIBUTE = 'data-markdown-marker';

/**
 * The attribute that carries a link's syntax through a block's inline content.
 * The resource link is the default and is therefore never written out.
 */
export const LINK_SYNTAX_ATTRIBUTE = 'data-markdown-link';

/**
 * The attribute that carries an image title's delimiter through a block's
 * inline content. `"` is the default and is therefore never written out.
 */
export const IMAGE_TITLE_QUOTE_ATTRIBUTE = 'data-markdown-title-quote';
