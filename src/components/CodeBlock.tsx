import type {ICodeBlockProps} from "@/types/components";

function CodeBlock({code, language}: ICodeBlockProps) {
    return (
        <div className={'rounded-lg overflow-hidden border border-code-border'}>
            {language && (
                <div className={'px-3 py-1.5 bg-code-bg border-b border-code-border'}>
                    <span className={'text-xs font-mono text-text-muted'}>{language}</span>
                </div>
            )}
            <pre className={'p-3 bg-code-bg overflow-x-auto'}>
                <code className={'text-xs font-mono text-text leading-relaxed'}>{code}</code>
            </pre>
        </div>
    );
}

export {CodeBlock};
