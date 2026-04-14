
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { CornerDownLeft, FileText, XCircle, Loader2, RefreshCw, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { MessageList, type Message } from '@/components/chat/message-list';
import { FinancialReportChart } from '@/components/chat/financial-report-chart';
import { ChatbotAvatar } from '@/components/abdullah-avatar';
import { chat } from '@/ai/flows/chat';
import { analyzeLoan } from '@/ai/flows/analyze-loan';
import { analyzeFinancialStatement } from '@/ai/flows/analyze-financial-statement';
import { useToast } from '@/hooks/use-toast';
import { LanguageToggle } from '@/components/language-toggle';
import { useLanguage } from '@/context/language-context';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ChatbotStatus } from '@/components/abdullah-status';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { saveChatHistory, loadChatHistory, clearChatHistory } from '@/lib/storage-utils';
import {
  CHAT_FILE_INPUT_ACCEPT,
  CHAT_UPLOAD_DRAG_MIMES,
  getMaxSizeForChatUpload,
  isChatFinancialUpload,
  isLikelySupportedDragMime,
} from '@/lib/chat-upload-utils';

function isStaleServerActionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /failed to find server action/i.test(msg);
}

const generateAndDownloadPdf = async (element: HTMLElement, fileName: string) => {
    try {
        const { default: jsPDF } = await import('jspdf');
        const { default: html2canvas } = await import('html2canvas');

        const canvas = await html2canvas(element, { useCORS: true, scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        let imgWidth = pdfWidth - 20; // Add margins
        let imgHeight = imgWidth / ratio;
        let heightLeft = imgHeight;
        let position = 10; // Top margin

        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight); // Left margin
        heightLeft -= (pdfHeight - 20); // Account for top/bottom margins

        while (heightLeft > 0) {
            position = heightLeft - imgHeight + 10; // Adjust position for new page
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - 20);
        }
        
        pdf.save(fileName);
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
};

type ReportToDownload = NonNullable<Message['analysisReport'] | Message['financialReport']>;
type ReportType = 'loan' | 'financial';


export default function ChatPageClient() {
  const { t, language, dir } = useLanguage();
  const [hasMounted, setHasMounted] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const [downloadInfo, setDownloadInfo] = useState<{
    type: ReportType;
    report: ReportToDownload;
    inputs: {
      pdfDataUri?: string | null;
      loanId?: string;
    }
  } | null>(null);

  const [pdfRenderContent, setPdfRenderContent] = useState<React.ReactNode | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [isNewSessionDialogOpen, setIsNewSessionDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragValid, setIsDragValid] = useState(true);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const items = e.dataTransfer?.items;
    if (items && items.length > 0 && items[0].kind === 'file') {
      const fileType = items[0].type;
      // Browsers often omit MIME for CSV; allow drop and validate on drop
      setIsDragValid(!fileType || CHAT_UPLOAD_DRAG_MIMES.has(fileType) || isLikelySupportedDragMime(fileType));
    } else {
      setIsDragValid(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTimeout(() => setIsDragging(false), 200);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isChatFinancialUpload(file)) {
        handleFinancialFileUpload({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>);
      } else {
        toast({
            variant: 'destructive',
            title: t('daUnsupportedFileType'),
            description: t('chatInvalidFinancialFileDesc'),
        });
      }
    }
  };
  

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    try {
      // Load chat history with size management
      const savedMessages = loadChatHistory();
      if (savedMessages && Array.isArray(savedMessages) && savedMessages.length > 0) {
        setMessages(savedMessages);
      } else {
        setMessages([{ id: '1', role: 'assistant', content: t('initialMessage') }]);
      }
    } catch (error) {
      console.error("Failed to access localStorage:", error);
      setMessages([{ id: '1', role: 'assistant', content: t('initialMessage') }]);
    }
  }, [t]);
  
  useEffect(() => {
    // Save messages if a user has sent a message, with size management
    if (messages.some(m => m.role === 'user')) {
        const result = saveChatHistory(messages);
        if (!result.success && result.error) {
            toast({
                variant: 'destructive',
                title: t('sessionSaveErrorTitle'),
                description: result.error || t('sessionSaveErrorDesc')
            });
        }
    }
  }, [messages, t, toast]);

  useEffect(() => {
    if (pdfRenderContent && pdfContainerRef.current) {
        const performDownload = async () => {
            const fileName = downloadInfo?.type === 'loan'
              ? `loan-report-${(downloadInfo.report as NonNullable<Message['analysisReport']>)?.loanId}.pdf`
              : `financial-report.pdf`;
            
            const success = await generateAndDownloadPdf(pdfContainerRef.current!, fileName);

            if (!success) {
                toast({
                  variant: 'destructive',
                  title: t('genericErrorTitle'),
                  description: t('pdfGenerationError')
                });
            }

            setPdfRenderContent(null);
            setIsDownloading(false);
            setDownloadInfo(null);
        };
        // A small delay to ensure the chart has rendered before capturing
        setTimeout(performDownload, 500);
    }
  }, [pdfRenderContent, t, toast, downloadInfo]);
  
  const handleSendMessage = async (e: React.FormEvent, messageOverride?: string) => {
    e.preventDefault();
    const currentInput = messageOverride || input;
    if (!currentInput.trim() || isLoading) return;

    const newUserMessage: Message = { id: Date.now().toString(), role: 'user', content: currentInput };
    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const loanAnalysisMatch = currentInput.trim().match(/^analyze loan id (\S+)/i);
      
      if (loanAnalysisMatch) {
        const loanId = loanAnalysisMatch[1];
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: t('loanAnalysisHeader', { loanId }) }]);
        
        const report = await analyzeLoan({ loanId, language });
        const analysisMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '',
          analysisReport: { ...report, loanId },
        };
        setMessages(prev => [...prev, analysisMessage]);

      } else {
        const historyForApi = newMessages.map(({ id, analysisReport, financialReport, ...rest }) => rest);
        const response = await chat({ history: historyForApi, pdfDataUri: pdfData, language });
        
        const botResponse: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: response.content,
          chart: response.chart,
        };
        
        setMessages(prev => [...prev, botResponse]);
      }
    } catch (error) {
      console.error(error);
      const stale = isStaleServerActionError(error);
      toast({
        variant: 'destructive',
        title: stale ? t('staleDeploymentTitle') : t('genericErrorTitle'),
        description: stale ? t('staleDeploymentDesc') : t('genericErrorDesc'),
      });
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: t('unableToAnalyzeMessage'),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinancialFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!isChatFinancialUpload(file)) {
      toast({
        variant: 'destructive',
        title: t('invalidPdfTitle'),
        description: t('chatInvalidFinancialFileDesc'),
      });
      if (event.target) event.target.value = '';
      return;
    }

    const maxSize = getMaxSizeForChatUpload(file);
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      toast({
        variant: 'destructive',
        title: t('fileTooLargeTitle') || 'File Too Large',
        description: t('fileTooLargeDesc', { maxSize: maxSizeMB }) || `File size exceeds ${maxSizeMB}MB limit. Please upload a smaller file.`,
      });
      if (event.target) event.target.value = '';
      return;
    }
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: t('analyzingPdfMessage', { fileName: file.name }),
    }]);

    setIsLoading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async (e) => {
      try {
        const dataUri = e.target?.result as string;
        const fileName = file.name;

        setPdfData(dataUri);
        setPdfFileName(fileName);
        toast({
          title: t('pdfUploadTitle'),
          description: t('pdfUploadDesc', { fileName }),
        });

        const report = await analyzeFinancialStatement({ pdfDataUri: dataUri, language });
        
        const reportMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: t('financialAnalysisHeader'),
          financialReport: report,
        };
        setMessages(prev => [...prev, reportMessage]);

      } catch (error) {
        console.error('Financial document analysis failed:', error);
        const stale = isStaleServerActionError(error);
        toast({
          variant: 'destructive',
          title: stale ? t('staleDeploymentTitle') : t('analysisFailedTitle'),
          description: stale ? t('staleDeploymentDesc') : t('analysisFailedDesc'),
        });
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: t('unableToAnalyzeMessage'),
        }]);
      } finally {
        setIsLoading(false);
        if (event.target) event.target.value = '';
      }
    };
  };

  const handleClearPdf = () => {
    setPdfData(null);
    setPdfFileName(null);
    toast({
      title: t('pdfClearedTitle'),
      description: t('pdfClearedDesc'),
    });
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: t('clearedPdfMessage')
    }]);
  };
  
  const promptDownload = (type: ReportType, report: ReportToDownload | undefined) => {
    if (!report) return;

    const inputs: { pdfDataUri?: string | null; loanId?: string } = {
        pdfDataUri: type === 'financial' ? pdfData : null,
        loanId: (report as NonNullable<Message['analysisReport']>)?.loanId
    };

    setDownloadInfo({ type, report, inputs });
  };

  const handleFinalDownload = async (lang: 'en' | 'ar') => {
    if (!downloadInfo || isDownloading) return;

    setIsDownloading(true);
    toast({ title: t('generatingTranslatedPdf') });

    try {
      let translatedReport: ReportToDownload;

      if (lang === language && downloadInfo.report) {
        translatedReport = downloadInfo.report;
      } else if (downloadInfo.type === 'financial' && downloadInfo.inputs.pdfDataUri) {
        translatedReport = await analyzeFinancialStatement({
          pdfDataUri: downloadInfo.inputs.pdfDataUri,
          language: lang,
        });
      } else if (downloadInfo.type === 'loan' && downloadInfo.inputs.loanId) {
        const report = await analyzeLoan({
          loanId: downloadInfo.inputs.loanId,
          language: lang,
        });
        translatedReport = { ...report, loanId: downloadInfo.inputs.loanId };
      } else {
        translatedReport = downloadInfo.report;
      }
      
      setPdfRenderContent(
        <PdfReportComponent
          report={translatedReport}
          type={downloadInfo.type}
          lang={lang}
        />
      );

    } catch (error) {
      console.error("Failed to generate translated report:", error);
      const stale = isStaleServerActionError(error);
      toast({
        variant: 'destructive',
        title: stale ? t('staleDeploymentTitle') : t('translationErrorTitle'),
        description: stale
          ? t('staleDeploymentDesc')
          : t('translationErrorDesc', { lang: lang === 'en' ? 'English' : 'Arabic' }),
      });
      setIsDownloading(false);
      setDownloadInfo(null);
    }
  };

  const getTranslatedTitles = (lang: 'en' | 'ar', report: ReportToDownload) => {
    const allTranslations = {
      en: {
        loanReportTitle: `Loan Analysis Report: ID ${(report as NonNullable<Message['analysisReport']>)?.loanId}`,
        financialReportTitle: "Financial Statement Analysis",
        summary: "Summary",
        prediction: "Prediction",
        eligibility: "Eligibility",
        creditScoreAssessment: "Credit Score Assessment",
        generatedBy: "AI generated by Banking Chatbot",
        trendsAndGraphsTitle: "Trends & Visualizations",
        identifiedFlawsTitle: "Identified Flaws & Risks",
        financialPerformanceTitle: "Financial Performance",
        revenue: "Revenue",
        netIncome: "Net Income",
      },
      ar: {
        loanReportTitle: `تقرير تحليل القرض: معرف ${(report as NonNullable<Message['analysisReport']>)?.loanId}`,
        financialReportTitle: "تحليل البيان المالي",
        summary: "ملخص",
        prediction: "توقع",
        eligibility: "الأهلية",
        creditScoreAssessment: "تقييم الجدارة الائتمانية",
        generatedBy: "تم إنشاؤه بواسطة الشات بوت المصرفي",
        trendsAndGraphsTitle: "الاتجاهات والتصورات",
        identifiedFlawsTitle: "العيوب والمخاطر المحددة",
        financialPerformanceTitle: "الأداء المالي",
        revenue: "الإيرادات",
        netIncome: "صافي الدخل",
      }
    };
    return allTranslations[lang];
  };

  const handleNewSession = () => {
    setMessages([{ id: '1', role: 'assistant', content: t('initialMessage') }]);
    clearChatHistory();
    
    setPdfData(null);
    setPdfFileName(null);

    setInput('');
    setIsLoading(false);

    toast({
        title: t('newSessionTitle'),
        description: t('newSessionDesc'),
    });
    setIsNewSessionDialogOpen(false);
  };
  
  const PdfReportComponent = ({ report, type, lang }: { report: ReportToDownload; type: ReportType; lang: 'en' | 'ar' }) => {
    const selectedTitles = getTranslatedTitles(lang, report);
    const isRtl = lang === 'ar';
    let reportTitle = '';
    let reportContentHtml;

    if (type === 'loan' && 'eligibility' in report) {
      reportTitle = selectedTitles.loanReportTitle;
      reportContentHtml = (
        <>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '15px', marginBottom: '5px' }}>{selectedTitles.summary}</h2>
          <p style={{ fontSize: '11px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{report.summary}</p>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '15px', marginBottom: '5px' }}>{selectedTitles.prediction}</h2>
          <p style={{ fontSize: '11px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{report.prediction}</p>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '15px', marginBottom: '5px' }}>{selectedTitles.eligibility}</h2>
          <p style={{ fontSize: '11px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{report.eligibility}</p>
        </>
      );
    } else if (type === 'financial' && 'creditScorePrediction' in report) {
      const financialReport = report as NonNullable<Message['financialReport']>;
      reportTitle = selectedTitles.financialReportTitle;
      
      const trendsHtml = financialReport.trendsAndGraphs ? (
        <>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '15px', marginBottom: '5px' }}>{selectedTitles.trendsAndGraphsTitle}</h2>
          <p style={{ fontSize: '11px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{financialReport.trendsAndGraphs}</p>
        </>
      ) : null;
      
      const flawsHtml = (financialReport.identifiedFlaws && financialReport.identifiedFlaws.length > 0) ? (
        <>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '15px', marginBottom: '5px' }}>{selectedTitles.identifiedFlawsTitle}</h2>
          <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
            {financialReport.identifiedFlaws.map((flaw, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ height: '8px', width: '8px', borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0, marginTop: '5px', [isRtl ? 'marginLeft' : 'marginRight']: '12px' }}></span>
                  <p style={{ fontSize: '11px', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{flaw}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null;

      const chartHtml = (financialReport.keyMetrics && financialReport.keyMetrics.length > 0) ? (
        <>
           <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '15px', marginBottom: '5px' }}>{selectedTitles.financialPerformanceTitle}</h2>
           <div style={{ width: '680px', height: '320px' }}>
              <FinancialReportChart 
                data={financialReport.keyMetrics} 
                revenueLabel={selectedTitles.revenue} 
                netIncomeLabel={selectedTitles.netIncome} 
                isAnimationActive={false}
              />
           </div>
        </>
      ) : null;

      reportContentHtml = (
        <>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '15px', marginBottom: '5px' }}>{selectedTitles.summary}</h2>
          <p style={{ fontSize: '11px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{financialReport.summary}</p>
          {trendsHtml}
          {chartHtml}
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '15px', marginBottom: '5px' }}>{selectedTitles.prediction}</h2>
          <p style={{ fontSize: '11px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{financialReport.prediction}</p>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '15px', marginBottom: '5px' }}>{selectedTitles.creditScoreAssessment}</h2>
          <p style={{ fontSize: '11px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{financialReport.creditScorePrediction}</p>
          {flawsHtml}
        </>
      );
    }
    
    return (
      <div 
        style={{ 
          width: '210mm', 
          padding: '15mm', 
          boxSizing: 'border-box',
          color: 'black',
          backgroundColor: 'white',
          fontFamily: isRtl ? "'Cairo', sans-serif" : "'Inter', sans-serif", 
          direction: isRtl ? 'rtl' : 'ltr' 
        }}
      >
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', textAlign: isRtl ? 'right' : 'left' }}>{reportTitle}</h1>
        {reportContentHtml}
        <p style={{ fontSize: '9px', color: '#555', marginTop: '40px', textAlign: 'center' }}>{selectedTitles.generatedBy}</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen text-foreground" dir={dir}>
      {!hasMounted ? (
        <div className="flex flex-col h-screen">
          <header className="grid grid-cols-3 items-center p-4 border-b shrink-0 bg-background/80 backdrop-blur-sm relative z-50">
            <div className="justify-self-start"><SidebarTrigger /></div>
            <h1 className="text-xl font-semibold tracking-tight justify-self-center">{t('pageTitle')}</h1>
            <div className="justify-self-end"><LanguageToggle /></div>
          </header>
          <main className="flex-1 overflow-y-auto flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </main>
        </div>
      ) : (
        <>
          <header className="grid grid-cols-3 items-center p-4 border-b shrink-0 bg-background/80 backdrop-blur-sm relative z-50">
                <div className="justify-self-start"><SidebarTrigger /></div>
                <h1 className="text-xl font-semibold tracking-tight justify-self-center">{t('pageTitle')}</h1>
                <div className="justify-self-end flex items-center gap-2">
                  <ChatbotStatus />
                  <TooltipProvider delayDuration={0}>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setIsNewSessionDialogOpen(true)}>
                                  <RefreshCw className="h-5 w-5" />
                                  <span className="sr-only">{t('newSessionButton')}</span>
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>{t('newSessionButton')}</p></TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
                  <LanguageToggle />
                </div>
              </header>
              <div 
                className="relative flex-1 overflow-hidden"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >

                <div className="h-full flex flex-col animate-in fade-in-50 duration-500">
                  <main id="chat-main" className="flex-1 overflow-y-auto">
                      <MessageList 
                      messages={messages} 
                      isLoading={isLoading} 
                      onDownloadLoanPdf={(report) => promptDownload('loan', report)}
                      onDownloadFinancialReportPdf={(report) => promptDownload('financial', report)}
                      />
                  </main>
                  <footer className="p-4 border-t shrink-0 bg-background">
                    <div className="max-w-3xl mx-auto">
                      {pdfFileName && (
                          <div className="flex items-center justify-between p-2 mb-2 text-sm rounded-md bg-muted text-muted-foreground">
                          <div className="flex items-center gap-2 truncate">
                              <FileText className="w-4 h-4 shrink-0" />
                              <span className="font-medium truncate">{t('analyzingFile', { fileName: pdfFileName })}</span>
                          </div>
                          <TooltipProvider>
                          <Tooltip>
                              <TooltipTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" onClick={handleClearPdf} className="w-6 h-6 shrink-0">
                                  <XCircle className="w-4 h-4" />
                                  <span className="sr-only">{t('clearPdfTooltip')}</span>
                              </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('clearPdfTooltip')}</TooltipContent>
                          </Tooltip>
                          </TooltipProvider>
                          </div>
                      )}
                      <form onSubmit={handleSendMessage} className="relative">
                          <Textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder={t('placeholder')}
                          className="pr-24 sm:pr-28 md:pr-32 py-3 text-base resize-none"
                          onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage(e);
                              }
                          }}
                          rows={1}
                          />
                          <div className="absolute top-1/2 right-2 sm:right-3 transform -translate-y-1/2 flex items-center space-x-0.5 sm:space-x-1">
                            <input
                              type="file"
                              ref={pdfInputRef}
                              onChange={handleFinancialFileUpload}
                              accept={CHAT_FILE_INPUT_ACCEPT}
                              className="hidden"
                            />
                            <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => pdfInputRef.current?.click()}>
                                    <FileText className="w-5 h-5" />
                                    <span className="sr-only">{t('uploadPdfTooltip')}</span>
                                </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('uploadPdfTooltip')}</TooltipContent>
                            </Tooltip>
                            </TooltipProvider>
                            <Button type="submit" size="sm" className="h-9" disabled={isLoading || !input.trim()}>
                                <CornerDownLeft className="w-5 h-5" />
                                <span className="sr-only">{t('sendSr')}</span>
                            </Button>
                          </div>
                      </form>
                    </div>
                  </footer>
                </div>
              </div>
          

          <AlertDialog open={isNewSessionDialogOpen} onOpenChange={setIsNewSessionDialogOpen}>
              <AlertDialogContent dir={dir}>
                  <AlertDialogHeader>
                      <AlertDialogTitle>{t('newSessionConfirmTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>{t('newSessionConfirmDescChat')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleNewSession}>{t('newSessionConfirmButton')}</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
          
          <AlertDialog open={!!downloadInfo} onOpenChange={(open) => !open && setDownloadInfo(null)}>
              <AlertDialogContent dir={dir}>
                  <AlertDialogHeader>
                      <AlertDialogTitle>{t('choosePdfLanguageTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>{t('choosePdfLanguageDesc')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDownloading}>{t('cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleFinalDownload('ar')} disabled={isDownloading}>
                        {isDownloading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('arabic')}
                      </AlertDialogAction>
                      <AlertDialogAction onClick={() => handleFinalDownload('en')} disabled={isDownloading}>
                        {isDownloading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('english')}
                      </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>

            {isDragging && (
                <div 
                    className={cn(
                        "pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity",
                        isDragging ? "opacity-100" : "opacity-0"
                    )}
                >
                    <div className={cn(
                        "flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-12 transition-colors",
                        isDragValid ? "border-primary" : "border-destructive"
                    )}>
                        <UploadCloud className={cn("h-12 w-12", isDragValid ? "text-primary" : "text-destructive")} />
                        <p className={cn("text-lg font-semibold", isDragValid ? "text-primary" : "text-destructive")}>
                            {isDragValid ? t('daDragDropValid') : t('daDragDropInvalid')}
                        </p>
                        <p className="text-sm text-muted-foreground">{t('chatDragDropSupported')}</p>
                    </div>
                </div>
            )}

          {pdfRenderContent && (
            <div ref={pdfContainerRef} className="absolute -left-[9999px] -z-10">
              {pdfRenderContent}
            </div>
          )}
        </>
      )}
    </div>
  );
}
