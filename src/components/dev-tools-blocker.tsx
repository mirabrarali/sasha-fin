
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/language-context';
import { ShieldAlert, RefreshCw, Copy, ClipboardPaste } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

export function DevToolsBlocker() {
    const { t, dir } = useLanguage();
    const { toast } = useToast();
    const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
    const isMobile = useIsMobile();

    const handleDevToolsChange = useCallback((isOpen: boolean) => {
        setIsDevToolsOpen(isOpen);
    }, []);

    const handleRefresh = () => window.location.reload();

    const handleCopy = async () => {
        const text = window.getSelection()?.toString();
        if (text) {
            await navigator.clipboard.writeText(text);
            toast({ title: 'Text copied to clipboard' });
        } else {
            toast({ variant: 'destructive', title: 'Nothing to copy', description: 'Please select text to copy.' });
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const activeElement = document.activeElement as HTMLElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                (activeElement as HTMLInputElement | HTMLTextAreaElement).value += text;
            } else {
                 toast({ variant: 'destructive', title: 'Cannot paste', description: 'Please focus an input field to paste text.' });
            }
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            toast({ variant: 'destructive', title: 'Paste failed', description: 'Could not read from clipboard. Please check permissions.' });
        }
    };
    
    const menuItems = [
        { label: 'Refresh', icon: RefreshCw, action: handleRefresh },
        { label: 'Copy', icon: Copy, action: handleCopy },
        { label: 'Paste', icon: ClipboardPaste, action: handlePaste },
    ];


    useEffect(() => {
        const threshold = 160;

        const checkDevTools = () => {
            // This resize check is unreliable on mobile and causes false positives.
            if (isMobile) return;

            const widthThreshold = window.outerWidth - window.innerWidth > threshold;
            const heightThreshold = window.outerHeight - window.innerHeight > threshold;
            
            if (widthThreshold || heightThreshold) {
                handleDevToolsChange(true);
            }
        };
        
        const interval = setInterval(checkDevTools, 500);

        const handleKeyDown = (event: KeyboardEvent) => {
             if (
                event.key === 'F12' ||
                (event.ctrlKey && event.shiftKey && event.key === 'I') ||
                (event.ctrlKey && event.shiftKey && event.key === 'J') ||
                (event.ctrlKey && event.shiftKey && event.key === 'C') ||
                (event.ctrlKey && event.key === 'U')
            ) {
                event.preventDefault();
                handleDevToolsChange(true);
            }
        };

        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault();
            setContextMenu({ x: event.clientX, y: event.clientY });
        };

        const handleClick = () => {
            if (contextMenu) setContextMenu(null);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('click', handleClick);

        console.log(
            "%cHello!",
            "color: #1a202c; font-size: 32px; font-weight: bold; -webkit-text-stroke: 1px #4299e1;"
        );
        console.log(
            "%c" + t('devToolsMessage'),
            "color: #4a5568; font-size: 16px;"
        );

        return () => {
            clearInterval(interval);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('click', handleClick);
        };
    }, [handleDevToolsChange, t, contextMenu, isMobile]);

    if (isDevToolsOpen) {
        return (
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm"
                dir={dir}
            >
                <div className="text-center p-8 max-w-md mx-auto">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
                        <ShieldAlert className="w-10 h-10 text-destructive" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-4">
                        {t('devToolsTitle')}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('devToolsDescription')}
                    </p>
                </div>
            </div>
        );
    }
    
    if (contextMenu) {
        return (
            <div
                style={{ top: contextMenu.y, left: contextMenu.x }}
                className="fixed z-[9999] bg-background border border-border rounded-md shadow-lg py-1 w-40 animate-in fade-in-50 duration-100"
            >
                <ul>
                    {menuItems.map(({ label, icon: Icon, action }) => (
                        <li key={label}>
                            <button
                                onClick={() => {
                                    action();
                                    setContextMenu(null);
                                }}
                                className="flex items-center w-full px-3 py-2 text-sm text-foreground hover:bg-accent"
                            >
                                <Icon className="w-4 h-4 mr-2" />
                                <span>{label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }

    return null;
}
