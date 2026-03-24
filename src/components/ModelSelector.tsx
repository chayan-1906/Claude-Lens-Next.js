"use client";

import React from "react";
import {PiBrainBold} from "react-icons/pi";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
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

const CHEVRON_SVG: string = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2371717A\' stroke-width=\'2.5\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")';
const SELECT_STYLE: React.CSSProperties = {
    backgroundImage: CHEVRON_SVG,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0px center',
    paddingRight: '14px',
};

function ModelSelector({selectedModel, selectedEffort, thinking, onModelChange, onEffortChange, onThinkingChange, disabled}: IModelSelectorProps) {
    const handleModelChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>): void => {
        onModelChange(e.target.value);
    }, [onModelChange]);

    const handleEffortChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>): void => {
        onEffortChange(e.target.value);
    }, [onEffortChange]);

    const handleThinkingToggle = React.useCallback((): void => {
        if (disabled) return;
        onThinkingChange(!thinking);
    }, [disabled, thinking, onThinkingChange]);

    return (
        <div className={'flex items-center gap-2'}>
            <select
                value={selectedModel}
                onChange={handleModelChange}
                disabled={disabled}
                className={'appearance-none bg-transparent border-0 text-xs font-medium text-text-muted hover:text-text cursor-pointer focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-colors'}
                style={SELECT_STYLE}
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
                className={'appearance-none bg-transparent border-0 text-xs font-medium text-text-muted hover:text-text cursor-pointer focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-colors'}
                style={SELECT_STYLE}
            >
                {EFFORT_OPTIONS.map((option: { value: string; label: string }) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>

            {/* Thinking toggle — brain icon, highlighted when ON */}
            <Button
                variant={'ghost'}
                size={'icon'}
                onClick={handleThinkingToggle}
                disabled={disabled}
                title={thinking ? 'Thinking: ON' : 'Thinking: OFF'}
                aria-label={thinking ? 'Disable extended thinking' : 'Enable extended thinking'}
                className={cn('size-5 rounded disabled:bg-transparent ', thinking ? 'text-primary hover:text-primary/80' : 'text-text-muted hover:text-primary/80')}
            >
                <PiBrainBold className={'size-3.5'}/>
            </Button>
        </div>
    );
}

export {ModelSelector};
