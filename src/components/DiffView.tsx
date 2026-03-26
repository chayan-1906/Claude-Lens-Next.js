"use client";

import React from "react";
import {cn} from "@/utils/cn";
import {DiffLineType, IDiffLine, IDiffViewProps} from "@/types/components";

/** Centralized color theme for the diff view — tweak these to change all diff colors in one place */
const diffColors: Record<string, Record<DiffLineType, string>> = {
    rowBg: {added: 'bg-success/10', removed: 'bg-error/10', context: ''},
    gutterSymbol: {added: 'text-success', removed: 'text-error', context: 'text-text-muted'},
    lineText: {added: 'text-success', removed: 'text-error', context: 'text-text'},
};

const badgeColors: Record<string, string> = {
    newFile: 'bg-success/15 text-success',
    edit: 'bg-warning/15 text-warning',
};

/**
 * Compute a simple line-level diff between two strings.
 * Uses a basic LCS approach for small inputs, falls back to direct comparison.
 */
function computeDiff(oldStr: string, newStr: string): IDiffLine[] {
    const oldLines: string[] = oldStr.split('\n');
    const newLines: string[] = newStr.split('\n');
    const result: IDiffLine[] = [];

    // Simple LCS-based diff for reasonable sizes
    const m: number = oldLines.length;
    const n: number = newLines.length;

    // Build LCS table
    const dp: number[][] = Array.from({length: m + 1}, () => Array(n + 1).fill(0));
    for (let i: number = 1; i <= m; i++) {
        for (let j: number = 1; j <= n; j++) {
            if (oldLines[i - 1] === newLines[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to produce diff
    const diff: { type: DiffLineType; text: string }[] = [];
    let i: number = m;
    let j: number = n;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
            diff.unshift({type: 'context', text: oldLines[i - 1]});
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            diff.unshift({type: 'added', text: newLines[j - 1]});
            j--;
        } else {
            diff.unshift({type: 'removed', text: oldLines[i - 1]});
            i--;
        }
    }

    // Assign line numbers
    let lineNum: number = 1;
    for (const entry of diff) {
        if (entry.type === 'removed') {
            result.push({type: 'removed', text: entry.text, lineNumber: null});
        } else {
            result.push({type: entry.type, text: entry.text, lineNumber: lineNum});
            lineNum++;
        }
    }

    return result;
}

function DiffView({toolName, filePath, oldString, newString, content}: IDiffViewProps) {
    const lines: IDiffLine[] = React.useMemo((): IDiffLine[] => {
        if (toolName === 'Write' && content !== undefined) {
            // Write tool — all lines are new (green)
            return content.split('\n').map((text: string, index: number): IDiffLine => ({
                type: 'added',
                text,
                lineNumber: index + 1,
            }));
        }

        if (oldString !== undefined && newString !== undefined) {
            return computeDiff(oldString, newString);
        }

        return [];
    }, [toolName, oldString, newString, content]);

    const maxLineNum: number = lines.reduce((max: number, line: IDiffLine) => line.lineNumber !== null ? Math.max(max, line.lineNumber) : max, 0);
    const gutterWidth: number = Math.max(3, String(maxLineNum).length);

    return (
        <div className={'rounded-lg border border-border overflow-hidden bg-surface'}>
            {/* File path header */}
            <div className={'flex items-center gap-2 px-3 py-2 bg-background border-b border-border'}>
                <span className={'text-xs font-mono text-text-muted truncate flex-1'} title={filePath}>{filePath}</span>
                <span className={cn('text-[10px] font-medium px-1.5 py-1 rounded', toolName === 'Write' ? badgeColors.newFile : badgeColors.edit)}>
                    {toolName === 'Write' ? 'NEW FILE' : 'EDIT'}
                </span>
            </div>

            {/* Diff content */}
            <div className={'overflow-x-auto max-h-80 overflow-y-auto'}>
                <pre className={'text-xs leading-5 font-mono'}>
                    {lines.map((line: IDiffLine, index: number) => (
                        <div key={index} className={cn('flex', diffColors.rowBg[line.type])}>
                            {/* Gutter: +/- indicator */}
                            <span className={cn('shrink-0 w-5 text-center select-none', diffColors.gutterSymbol[line.type])}>
                                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                            </span>

                            {/* Line number */}
                            <span className={'shrink-0 text-text-muted/50 select-none text-right pr-3'} style={{width: `${gutterWidth + 1}ch`}}>
                                {line.lineNumber ?? ''}
                            </span>

                            {/* Line content */}
                            <span className={cn('flex-1 pr-3', diffColors.lineText[line.type])}>
                                {line.text || '\u00A0'}
                            </span>
                        </div>
                    ))}
                </pre>
            </div>
        </div>
    );
}

export {DiffView};
