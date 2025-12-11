'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Check, Clipboard } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

export const CodeBlock = ({ text }: { text: string }) => {
    const { toast } = useToast();
    const [hasCopied, setHasCopied] = useState(false);
    
    const onCopy = () => {
        navigator.clipboard.writeText(text);
        setHasCopied(true);
        toast({ title: 'Copied to clipboard!' });
        setTimeout(() => {
            setHasCopied(false);
        }, 2000);
    };

    return (
        <div className="relative mt-2">
            <pre className="bg-muted text-muted-foreground p-4 rounded-md text-sm overflow-x-auto">
                <code>{text}</code>
            </pre>
            <button
                onClick={onCopy}
                className="absolute top-2 right-2 p-1.5 bg-background text-muted-foreground rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Copy code"
            >
                {hasCopied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
            </button>
        </div>
    );
};
