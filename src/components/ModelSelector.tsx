"use client";

import React from "react";
import {cn} from "@/utils/cn";
import type {IModelConfig, IModelSelectorProps} from "@/types/components";

const MODEL_CONFIG: IModelConfig[] = [
    {value: 'sonnet', label: 'Sonnet'},
    {value: 'opus', label: 'Opus'},
    {value: 'haiku', label: 'Haiku'},
];

const EFFORT_OPTIONS: { value: string; label: string }[] = [
    {value: 'low', label: 'Low'},
    {value: 'medium', label: 'Medium'},
    {value: 'high', label: 'High'},
    {value: 'max', label: 'Max'},
];

const CHEVRON_SVG: string = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2371717A\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")';
const SELECT_BG_STYLE: React.CSSProperties = {backgroundImage: CHEVRON_SVG, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '28px'};

function ModelSelector({selectedModel, selectedEffort, onModelChange, onEffortChange, disabled}: IModelSelectorProps) {
    const handleModelChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>): void => {
        onModelChange(e.target.value);
    }, [onModelChange]);

    const handleEffortChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>): void => {
        onEffortChange(e.target.value);
    }, [onEffortChange]);

    return (
        <div className={'flex items-center gap-2'}>
            {/* Model dropdown */}
            <select
                value={selectedModel}
                onChange={handleModelChange}
                disabled={disabled}
                className={cn(
                    'h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-text',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'cursor-pointer appearance-none',
                )}
                style={SELECT_BG_STYLE}
            >
                {MODEL_CONFIG.map((option: IModelConfig) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>

            {/* Effort dropdown — always shown for all models; backend handles invalid combos */}
            <select
                value={selectedEffort}
                onChange={handleEffortChange}
                disabled={disabled}
                className={cn(
                    'h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'cursor-pointer appearance-none',
                )}
                style={SELECT_BG_STYLE}
            >
                {EFFORT_OPTIONS.map((option: { value: string; label: string }) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
        </div>
    );
}

export {ModelSelector};
