"use client";

import React from "react";
import type {IModelSwitcherProps} from "@/types/components";

function ModelSwitcher({model}: IModelSwitcherProps) {
    // Display-only for now — model is determined by Claude CLI config
    // Future: could send model preference to backend
    if (!model) return null;

    return (
        <span className={'text-xs font-mono text-text-muted px-2 py-1 bg-surface border border-border rounded'}>
            {model}
        </span>
    );
}

export {ModelSwitcher};
