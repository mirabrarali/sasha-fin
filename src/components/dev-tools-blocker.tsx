
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/language-context';
import { ShieldAlert } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export function DevToolsBlocker() {
    const { t, dir } = useLanguage();
    const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
    const isMobile = useIsMobile();

    const handleDevToolsChange = useCallback((isOpen: boolean) => {
        setIsDevToolsOpen(isOpen);
    }, []);

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
            // We're just logging to the console now, not preventing the default menu.
        };

        window.addEventListener('keydown', handleKeyDown);
        // We no longer prevent the default context menu.
        // window.addEventListener('contextmenu', handleContextMenu);

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
            // window.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [handleDevToolsChange, t, isMobile]);

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

    return null;
}
