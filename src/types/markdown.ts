/** ------------- Constants and Type Aliases ------------- */


/** ------------- API response types ------------- */


/** ------------- function params ------------- */

/** Prefix/suffix pair to wrap around text for a markdown format */
export interface IMarkdownFormat {
    prefix: string;
    suffix: string;
}

/** Result after applying or toggling a markdown format */
export interface IApplyFormatResult {
    newText: string;
    selStart: number;
    selEnd: number;
}
