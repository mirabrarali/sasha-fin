
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { HotTable } from '@handsontable/react';
import type Handsontable from 'handsontable';
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

import { LanguageToggle } from '@/components/language-toggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Loader2, Send, MessageSquare, X, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { spreadsheetAssistant } from '@/ai/flows/spreadsheet-assistant';
import { SpreadsheetToolbar } from '@/components/spreadsheet/toolbar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AbdullahAvatar } from '@/components/abdullah-avatar';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { templates } from '@/lib/spreadsheet-templates';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AbdullahStatus } from '@/components/abdullah-status';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Spreadsheet = dynamic(
  () => import('@/components/spreadsheet/spreadsheet').then((mod) => mod.Spreadsheet),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-muted/40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);

const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });
const Pie = dynamic(() => import('react-chartjs-2').then(mod => mod.Pie), { ssr: false });

const initialData = Array.from({ length: 50 }, () => Array(26).fill(''));

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChartData = {
  type: 'bar' | 'pie';
  title: string;
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string[];
    }[];
  };
};

export default function SpreadsheetClient() {
  const { t, language, dir } = useLanguage();
  const [hasMounted, setHasMounted] = useState(false);

  const [sheetData, setSheetData] = useState<any[][]>(initialData);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const hotRef = useRef<HotTable>(null);
  const [hotInstance, setHotInstance] = useState<Handsontable | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [isNewSessionDialogOpen, setIsNewSessionDialogOpen] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hotRef.current) {
      const instance = hotRef.current.hotInstance;
      setHotInstance(instance);
    }
  }, []);

  useEffect(() => {
    if (hotInstance && !hotInstance.isDestroyed) {
      hotInstance.loadData(sheetData);
      hotInstance.render();
    }
  }, [sheetData, hotInstance]);

  useEffect(() => {
    setChatMessages([
      { role: 'assistant', content: t('abdullahSpreadsheetHello') },
    ]);
  }, [t]);

  const handleFullscreenChange = useCallback(() => {
    const isCurrentlyFullscreen = !!document.fullscreenElement;
    setIsFullscreen(isCurrentlyFullscreen);
    if (hotInstance) {
      // Force a re-render to fix context menu positioning issues
      setTimeout(() => {
        hotInstance.render();
      }, 0);
    }
  }, [hotInstance]);

  const toggleFullscreen = () => {
    if (!fullscreenRef.current) return;
    if (!document.fullscreenElement) {
      fullscreenRef.current.requestFullscreen().catch((err) => {
        alert(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
        );
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [handleFullscreenChange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isLoading]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const getChartColors = (numColors: number) => {
    const colors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
      'hsl(222.2, 47.4%, 11.2%)',
    ];
    let result = [];
    for (let i = 0; i < numColors; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  };

  const convertA1RangeToChartData = (
    dataRange: { labels: string; data: string | string[] },
    currentSheetData: any[][]
  ) => {
    if (!dataRange || !dataRange.labels || !dataRange.data || typeof dataRange.labels !== 'string' || dataRange.labels.indexOf(':') === -1) {
        return { labels: [], datasets: [] };
    }
    const { labels: labelsRange, data: dataRanges } = dataRange;

    const labelsCoords = XLSX.utils.decode_range(labelsRange);
    const labels = [];
    for (let R = labelsCoords.s.r; R <= labelsCoords.e.r; ++R) {
      labels.push(currentSheetData[R]?.[labelsCoords.s.c] ?? '');
    }

    const datasets = (Array.isArray(dataRanges) ? dataRanges : [dataRanges]).map(
      (range) => {
        if (!range || typeof range !== 'string' || range.indexOf(':') === -1) return { label: 'Dataset', data: [], backgroundColor: [] };
        const dataCoords = XLSX.utils.decode_range(range);
        const data = [];
        const headerRow = dataCoords.s.r > 0 ? dataCoords.s.r - 1 : 0;
        const label =
          currentSheetData[headerRow]?.[dataCoords.s.c] ?? 'Dataset';

        for (let R = dataCoords.s.r; R <= dataCoords.e.r; ++R) {
          const cellValue = currentSheetData[R]?.[dataCoords.s.c];
          let val = 0;
          if (typeof cellValue === 'string') {
            val = parseFloat(cellValue.replace(/[^0-9.-]+/g, ''));
          } else if (typeof cellValue === 'number') {
            val = cellValue;
          }
          data.push(isNaN(val) ? 0 : val);
        }
        return {
          label: label,
          data: data,
          backgroundColor: getChartColors(data.length),
        };
      }
    );

    return { labels, datasets };
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCharts([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellNF: true, cellStyles: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: false,
          defval: ''
        });

        const paddedData = json.map(row => {
            const newRow = [...(row as any[])];
            while (newRow.length < 26) newRow.push('');
            return newRow;
        });
        while(paddedData.length < 50) paddedData.push(Array(26).fill(''));
        
        if (hotInstance) {
           hotInstance.updateSettings({ mergeCells: [] });
        }
        setSheetData(paddedData);

        toast({
          title: t('importSuccessTitle'),
          description: t('importSuccessDesc', { fileName: file.name }),
        });
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: t('abdullahSpreadsheetFileLoaded', { fileName: file.name }),
          },
        ]);
      } catch (error) {
        console.error('Error importing file:', error);
        toast({
          variant: 'destructive',
          title: t('importFailedTitle'),
          description: t('importFailedDesc'),
        });
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = '';
  };
  
  const handleSetTemplate = (template: { data: any[][], mergeCells?: Handsontable.MergeCells.Settings[] }) => {
    setCharts([]);
    if (hotInstance) {
        hotInstance.batch(() => {
            hotInstance.updateSettings({
                mergeCells: [],
                cell: [],
            });
            const commentsPlugin = hotInstance.getPlugin('comments');
            if (commentsPlugin && typeof commentsPlugin.clearComments === 'function') {
                try {
                    commentsPlugin.clearComments();
                } catch (e) {
                    console.warn("Could not clear comments, plugin might be clearing itself up.");
                }
            }
        });

        const newData = template.data.map(row => 
            row.map(cell => (cell && typeof cell === 'object' && cell.value !== undefined) ? cell.value : cell)
        );

        setSheetData(newData);
        
        setTimeout(() => {
            hotInstance.batch(() => {
                template.data.forEach((row, r) => {
                    row.forEach((cell, c) => {
                        if (cell && typeof cell === 'object') {
                            const { value, ...meta } = cell;
                            for (const key in meta) {
                                hotInstance.setCellMeta(r, c, key, (meta as any)[key]);
                            }
                        }
                    });
                });
                
                if (template.mergeCells) {
                    hotInstance.updateSettings({ mergeCells: template.mergeCells });
                }
            });
            hotInstance.render();
        }, 0);

    } else {
        const fallbackData = template.data.map(row => 
            row.map(cell => (cell && typeof cell === 'object' && cell.value !== undefined) ? cell.value : cell)
        );
        setSheetData(fallbackData);
    }

    toast({
        title: t('templateAppliedTitle'),
        description: t('templateAppliedDesc'),
    });
  };

  const handleAbdullahSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || !hotInstance) return;

    const newMessages: ChatMessage[] = [
      ...chatMessages,
      { role: 'user', content: prompt },
    ];
    setChatMessages(newMessages);
    const currentPrompt = prompt;
    setPrompt('');
    setIsLoading(true);

    try {
      const currentData = hotInstance.getData();
      const response = await spreadsheetAssistant({
        prompt: currentPrompt,
        sheetData: currentData,
        language,
      });

      const firstConfirmation = response.operations.find(
        (op) => op.confirmation
      )?.confirmation;
      if (firstConfirmation) {
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: firstConfirmation },
        ]);
      }
      
      let newData: any[][] | null = null;
      let finalDataForCharts: any[][] = currentData;
      
      hotInstance.batch(() => {
        for (const op of response.operations) {
          switch (op.command) {
            case 'setTemplate':
              const template = templates.find(t => t.id === op.params.templateName);
              if (template) {
                handleSetTemplate(template);
                finalDataForCharts = template.data.map(row => 
                    row.map(cell => (cell && typeof cell === 'object' && cell.value !== undefined) ? cell.value : cell)
                );
              }
              break;
            case 'clearSheet':
              const clearedData = Array.from({ length: 50 }, () =>
                Array(26).fill('')
              );
              hotInstance.updateSettings({ cell: [], comments: false, mergeCells: [] });
              const commentsPlugin = hotInstance.getPlugin('comments');
              if (commentsPlugin && typeof commentsPlugin.clearComments === 'function') {
                try {
                  commentsPlugin.clearComments();
                } catch(e) { console.warn("Could not clear comments during clearSheet.") }
              }
              newData = clearedData;
              setCharts([]);
              break;
            case 'setData':
              if (op.params.data) {
                hotInstance.updateSettings({ mergeCells: [] });
                newData = op.params.data;
                setCharts([]);
              }
              break;
            case 'formatCells':
              const { range, properties } = op.params;
              if (range && properties) {
                for (let row = range.row; row <= range.row2; row++) {
                  for (let col = range.col; col <= range.col2; col++) {
                    const cell = hotInstance.getCell(row, col);
                    if (!cell) continue;

                    let classNames = (cell.className || '').split(' ').filter(Boolean);
                    
                    const alignments = ['htLeft', 'htCenter', 'htRight', 'htJustify'];
                    classNames = classNames.filter(c => !alignments.includes(c));
                    if (properties.alignment) classNames.push(properties.alignment);

                    if (properties.bold) classNames.push('ht-cell-bold');
                    else classNames = classNames.filter(c => c !== 'ht-cell-bold');
                    
                    if (properties.italic) classNames.push('ht-cell-italic');
                    else classNames = classNames.filter(c => c !== 'ht-cell-italic');
                    
                    if (properties.underline) classNames.push('ht-cell-underline');
                    else classNames = classNames.filter(c => c !== 'ht-cell-underline');

                    if (properties.className) {
                        const newClasses = properties.className.split(' ');
                        const bgClass = newClasses.find(c => c.startsWith('ht-bg-'));
                        const textClass = newClasses.find(c => c.startsWith('ht-text-'));
                        
                        classNames = classNames.filter(c => !c.startsWith('ht-bg-'));
                        classNames = classNames.filter(c => !c.startsWith('ht-text-'));

                        if (bgClass) classNames.push(bgClass);
                        if (textClass) classNames.push(textClass);
                    }
                    cell.className = classNames.join(' ');
                    
                    if (properties.readOnly !== undefined) {
                      hotInstance.setCellMeta(row, col, 'readOnly', properties.readOnly);
                    }

                    if (properties.numericFormat) {
                      hotInstance.setCellMeta(row, col, 'type', 'numeric');
                      hotInstance.setCellMeta(row, col, 'numericFormat', properties.numericFormat);
                    } else {
                       if (hotInstance.getCellMeta(row, col).type === 'numeric' && !properties.numericFormat) {
                           hotInstance.setCellMeta(row, col, 'type', 'text');
                       }
                    }
                  }
                }
              }
              break;
            case 'createChart':
            case 'info':
              break;
          }
        }
      });
      
      if (newData) {
          setSheetData(newData);
          finalDataForCharts = newData;
      }
      
      const chartOps = response.operations.filter(op => op.command === 'createChart');
      if(chartOps.length > 0) {
        const newCharts: ChartData[] = [];
        for (const op of chartOps) {
          const { type, title, dataRange } = op.params;
          newCharts.push({
            type,
            title,
            data: convertA1RangeToChartData(dataRange, finalDataForCharts),
          });
        }
        setCharts(prev => [...prev, ...newCharts]);
      }

      hotInstance.render();
    } catch (error) {
      console.error(error);
      const errorMessage = t('abdullahSpreadsheetError');
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: errorMessage },
      ]);
      toast({
        variant: 'destructive',
        title: t('genericErrorTitle'),
        description: t('genericErrorDesc'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    if (!hotInstance) return;

    hotInstance.batch(() => {
        hotInstance.updateSettings({
            mergeCells: [],
            cell: [],
        });
        const commentsPlugin = hotInstance.getPlugin('comments');
        if (commentsPlugin && typeof commentsPlugin.clearComments === 'function') {
            try {
                commentsPlugin.clearComments();
            } catch (e) {
                console.warn("Could not clear comments during session reset.");
            }
        }
    });
    setSheetData(initialData);

    setCharts([]);
    setChatMessages([{ role: 'assistant', content: t('abdullahSpreadsheetHello') }]);
    setPrompt('');
    setIsLoading(false);

    toast({
        title: t('newSessionTitle'),
        description: t('newSessionDescSpreadsheet'),
    });
    setIsNewSessionDialogOpen(false);
  };

  if (!hasMounted) {
    return (
        <div className="flex flex-col h-screen bg-background text-foreground" dir={dir}>
            <header className="grid grid-cols-3 items-center p-4 border-b shrink-0 relative z-30">
                <div className="justify-self-start flex items-center gap-2">
                    <SidebarTrigger />
                </div>
                <h1 className="text-xl font-semibold tracking-tight justify-self-center">
                    {t('spreadsheetTitle')}
                </h1>
                <div className="justify-self-end flex items-center gap-2">
                    <LanguageToggle />
                </div>
            </header>
            <main className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </main>
        </div>
    );
  }

  return (
    <div
      ref={fullscreenRef}
      className="flex flex-col h-screen bg-background text-foreground"
      dir={dir}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        className="hidden"
        accept=".xlsx, .xls, .csv"
      />
      <header className="grid grid-cols-3 items-center p-4 border-b shrink-0 relative z-50">
        <div className="justify-self-start flex items-center gap-2">
          <SidebarTrigger />
        </div>
        <h1 className="text-xl font-semibold tracking-tight justify-self-center">
          {t('spreadsheetTitle')}
        </h1>
        <div className="justify-self-end flex items-center gap-2">
           <AbdullahStatus />
           <TooltipProvider>
              <UiTooltip>
                  <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setIsNewSessionDialogOpen(true)}>
                          <RefreshCw className="h-5 w-5" />
                          <span className="sr-only">{t('newSessionButton')}</span>
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                      <p>{t('newSessionButton')}</p>
                  </TooltipContent>
              </UiTooltip>
          </TooltipProvider>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsChatOpen(!isChatOpen)}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="sr-only">
              {isChatOpen ? t('hideChat') : t('showChat')}
            </span>
          </Button>
          <LanguageToggle />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
          <>
              <SpreadsheetToolbar
                hotInstance={hotInstance}
                onImport={handleImportClick}
                toggleFullscreen={toggleFullscreen}
                isFullscreen={isFullscreen}
                onSetTemplate={handleSetTemplate}
              />

              <div className="flex flex-1 overflow-hidden">
                <main className="flex-1 overflow-auto flex flex-col">
                  <div className="flex-1 min-h-0">
                    <Spreadsheet data={sheetData} hotRef={hotRef} />
                  </div>
                  {charts.length > 0 && (
                    <ScrollArea className="flex-shrink-0 border-t bg-muted/40 max-h-[45vh]">
                      <section className="p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="text-lg font-semibold text-center flex-grow">
                            {t('chartsTitle')}
                          </h2>
                          <Button variant="ghost" size="icon" onClick={() => setCharts([])} className="h-7 w-7">
                              <X className="h-4 w-4" />
                              <span className="sr-only">Close charts</span>
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {charts.map((chart, index) => (
                            <Card key={index} className="shadow-lg">
                              <CardHeader>
                                <CardTitle>{chart.title}</CardTitle>
                              </CardHeader>
                              <CardContent className="h-[350px]">
                                {chart.type === 'bar' ? (
                                  <Bar
                                    data={chart.data}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      plugins: { legend: { position: 'top' } },
                                    }}
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <Pie
                                      data={chart.data}
                                      options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { position: 'right' } },
                                      }}
                                    />
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </section>
                    </ScrollArea>
                  )}
                </main>

                {isChatOpen && (
                  <aside
                    className={cn(
                      'w-full max-w-[400px] sm:w-[350px] border-l bg-background flex flex-col h-full animate-in duration-300 z-30',
                      dir === 'ltr'
                        ? 'slide-in-from-right-sm'
                        : 'slide-in-from-left-sm'
                    )}
                  >
                    <div className="p-4 border-b flex items-center justify-between">
                      <h2 className="text-lg font-semibold tracking-tight">
                        {t('chatWithAbdullah')}
                      </h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsChatOpen(false)}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">{t('closeChat')}</span>
                      </Button>
                    </div>
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {chatMessages.map((message, index) => (
                          <div
                            key={index}
                            className={cn(
                              'flex items-start gap-3 animate-in fade-in',
                              { 'justify-end flex-row-reverse': message.role === 'user' }
                            )}
                          >
                            {message.role === 'assistant' && (
                              <AbdullahAvatar className="w-8 h-8 shrink-0" />
                            )}
                            <div
                              className={cn(
                                'rounded-lg p-3 text-sm shadow-sm',
                                {
                                  'bg-primary text-primary-foreground':
                                    message.role === 'assistant',
                                  'bg-card text-card-foreground':
                                    message.role === 'user',
                                }
                              )}
                            >
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            </div>
                            {message.role === 'user' && (
                              <Avatar className="w-8 h-8 shrink-0">
                                <AvatarFallback>
                                  <User className="w-4 h-4" />
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        ))}
                        {isLoading && (
                          <div
                            className={cn('flex items-start gap-3', {
                              'justify-end flex-row-reverse': dir === 'rtl',
                            })}
                          >
                            <AbdullahAvatar className="w-8 h-8 shrink-0" />
                            <div className="bg-primary text-primary-foreground rounded-lg p-3 shadow-sm flex items-center space-x-1">
                              <span className="w-2 h-2 bg-primary-foreground/50 rounded-full animate-pulse delay-0 duration-1000"></span>
                              <span className="w-2 h-2 bg-primary-foreground/50 rounded-full animate-pulse delay-200 duration-1000"></span>
                              <span className="w-2 h-2 bg-primary-foreground/50 rounded-full animate-pulse delay-400 duration-1000"></span>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                    <div className="p-4 border-t bg-background">
                      <form onSubmit={handleAbdullahSubmit} className="relative">
                        <Textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={t('spreadsheetPlaceholder')}
                          className="pr-12 text-base resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAbdullahSubmit(e);
                            }
                          }}
                          rows={1}
                          disabled={isLoading}
                        />
                        <Button
                          type="submit"
                          size="icon"
                          className={cn(
                            'absolute top-1/2 transform -translate-y-1/2 h-8 w-8',
                            dir === 'ltr' ? 'right-2' : 'left-2'
                          )}
                          disabled={isLoading || !prompt.trim()}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          <span className="sr-only">{t('send')}</span>
                        </Button>
                      </form>
                    </div>
                  </aside>
                )}
              </div>
          </>
      </div>


       <AlertDialog open={isNewSessionDialogOpen} onOpenChange={setIsNewSessionDialogOpen}>
          <AlertDialogContent dir={dir}>
              <AlertDialogHeader>
                  <AlertDialogTitle>{t('newSessionConfirmTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('newSessionConfirmDescSpreadsheet')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleNewSession}>{t('newSessionConfirmButton')}</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
