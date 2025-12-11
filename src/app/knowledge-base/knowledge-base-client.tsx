
'use client';

import { useState, useEffect } from 'react';
import { LanguageToggle } from '@/components/language-toggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Loader2, Save, BrainCircuit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/hooks/use-toast';
import { getKnowledge, saveKnowledge } from '@/actions/knowledge-base-actions';

export default function KnowledgeBaseClient() {
    const { t, dir } = useLanguage();
    const { toast } = useToast();
    
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        async function loadKnowledge() {
            try {
                const data = await getKnowledge();
                setNotes(data);
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: t('kbLoadErrorTitle'),
                    description: t('kbLoadErrorDesc'),
                });
            } finally {
                setIsLoading(false);
            }
        }
        loadKnowledge();
    }, [t, toast]);
    
    const handleSave = async () => {
        setIsSaving(true);
        const result = await saveKnowledge(notes);
        if (result.success) {
            toast({
                title: t('kbSaveSuccessTitle'),
                description: t('kbSaveSuccessDesc'),
            });
        } else {
            toast({
                variant: 'destructive',
                title: t('kbSaveErrorTitle'),
                description: t('kbSaveErrorDesc'),
            });
        }
        setIsSaving(false);
    };
    
    return (
        <div className="flex flex-col h-screen bg-muted/40 text-foreground" dir={dir}>
            <header className="grid grid-cols-3 items-center p-4 border-b shrink-0 bg-background">
                <div className="justify-self-start">
                    <SidebarTrigger />
                </div>
                <h1 className="text-xl font-semibold tracking-tight justify-self-center">{t('knowledgeBaseTitle')}</h1>
                <div className="justify-self-end">
                    <LanguageToggle />
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in-50 duration-500">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <BrainCircuit className="w-8 h-8 text-primary"/>
                                <CardTitle className="text-3xl">{t('kbHeader')}</CardTitle>
                            </div>
                            <CardDescription className="text-base">{t('kbSubHeader')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder={t('kbPlaceholder')}
                                    className="min-h-[300px] sm:min-h-[400px] md:min-h-[500px] text-base font-mono"
                                    disabled={isSaving}
                                />
                            )}
                        </CardContent>
                    </Card>
                     <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={isLoading || isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('kbSavingButton')}
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {t('kbSaveButton')}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
