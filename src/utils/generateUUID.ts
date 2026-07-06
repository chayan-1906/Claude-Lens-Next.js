/**
 * Generates a RFC 4122 v4 UUID.
 * Uses crypto.randomUUID() in secure contexts (HTTPS / localhost),
 * falls back to crypto.getRandomValues() for insecure contexts (plain HTTP on IP addresses).
 */
function generateUUID(): string {
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: string): string => {
        const n: number = Number(c);
        return (n ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))).toString(16);
    });
}

export {generateUUID};
