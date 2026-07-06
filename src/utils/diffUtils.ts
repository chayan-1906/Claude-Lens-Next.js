export function getDiffStats(oldStr: string, newStr: string): {added: number; removed: number} {
    const oldLines: string[] = oldStr.split('\n');
    const newLines: string[] = newStr.split('\n');
    const removed: number = oldLines.filter((l: string) => !newLines.includes(l)).length;
    const added: number = newLines.filter((l: string) => !oldLines.includes(l)).length;
    return {added, removed};
}
