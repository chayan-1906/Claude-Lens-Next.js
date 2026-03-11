function formatModelName(modelId: string): string {
    return modelId
        .replace(/-\d{8}$/, '')
        .split('-')
        .map((part: string) => /^\d+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
        .replace(/(\d+)\s+(\d+)/g, '$1.$2');
}

export {formatModelName};
