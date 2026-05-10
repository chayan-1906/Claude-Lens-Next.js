/** ------------- Constants and Type Aliases ------------- */

/** A keyboard chord — physical key + optional modifiers. Cross-platform: `mod` resolves to ⌘ on Mac, Ctrl on Windows/Linux. */
export interface IShortcutSpec {
    code: string;
    mod?: boolean;
    shift?: boolean;
    alt?: boolean;
}

/** Optional gating for a shortcut. */
export interface IShortcutOptions {
    enabled?: boolean;
    skipWhenTextInput?: boolean;
}

export type NavigatorWithUAData = Navigator & {
    userAgentData?: {
        platform?: string;
    };
};


/** ------------- API response types ------------- */


/** ------------- function params ------------- */
