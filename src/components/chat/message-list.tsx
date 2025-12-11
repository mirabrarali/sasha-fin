'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import NextImage from 'next/image';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AbdullahAvatar } from '@/components/abdullah-avatar';
import { User, Download, Loader2, BarChart, PieChart, Volume2, Square } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/context/language-context';
import { BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const FinancialReportChart = dynamic(
  () => import('./financial-report-chart').then((mod) => mod.FinancialReportChart),
  {
    loading: () => (
      <div className="flex h-[386px] w-full items-center justify-center rounded-lg border bg-card p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false,
  }
);

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  analysisReport?: {
    summary: string;
    prediction: string;
    eligibility: string;
    loanId: string;
  };
  financialReport?: {
    summary: string;
    trendsAndGraphs: string;
    prediction: string;
    creditScorePrediction: string;
    identifiedFlaws: string[];
    keyMetrics: {
      name: string;
      revenue?: number;
      netIncome?: number;
    }[];
  };
  chart?: {
    type: 'bar' | 'pie';
    title: string;
    data: {
      labels: string[];
      datasets: {
        label: string;
        data: number[];
      }[];
    }
  }
};

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onDownloadLoanPdf: (report: Message['analysisReport']) => void;
  onDownloadFinancialReportPdf: (report: Message['financialReport']) => void;
}

export function MessageList({ messages, isLoading, onDownloadLoanPdf, onDownloadFinancialReportPdf }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    // Clean up speech synthesis on component unmount or when dependencies change
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [messages]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
        {messages.map((message) => (
          <ChatMessage 
            key={message.id} 
            message={message} 
            onDownloadLoanPdf={onDownloadLoanPdf}
            onDownloadFinancialReportPdf={onDownloadFinancialReportPdf}
            nowPlaying={nowPlaying}
            setNowPlaying={setNowPlaying}
          />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}

function ChatMessage({ 
  message, 
  onDownloadLoanPdf,
  onDownloadFinancialReportPdf,
  nowPlaying,
  setNowPlaying,
}: { 
  message: Message, 
  onDownloadLoanPdf: (report: Message['analysisReport']) => void; 
  onDownloadFinancialReportPdf: (report: Message['financialReport']) => void;
  nowPlaying: string | null;
  setNowPlaying: (id: string | null) => void;
}) {
  const { t, language } = useLanguage();
  const isAssistant = message.role === 'assistant';
  const isPlaying = nowPlaying === message.id;

  const handleTextToSpeech = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setNowPlaying(null);
      return;
    }

    if (nowPlaying) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.lang = language === 'ar' ? 'ar-SA' : 'en-US';

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find(
      (voice) =>
        voice.lang.startsWith(language) && voice.name.includes('Female')
    );

    // Fallback if no female voice is found
    if (!selectedVoice) {
      selectedVoice = voices.find((voice) => voice.lang.startsWith(language));
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      setNowPlaying(message.id);
    };

    utterance.onend = () => {
      setNowPlaying(null);
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error', e);
      setNowPlaying(null);
    };
    
    window.speechSynthesis.speak(utterance);
  };
  
  return (
    <div
      className={cn('flex items-start gap-3 sm:gap-4 animate-in fade-in', {
        'justify-end': !isAssistant,
      })}
    >
      {isAssistant && <AbdullahAvatar className="w-8 h-8 shrink-0" />}
      <div className="max-w-[90%] sm:max-w-[80%] md:max-w-[75%] space-y-2">
        {message.content && (
          <div
            className={cn(
              'rounded-lg p-3 text-sm shadow-sm',
              {
                'bg-card text-card-foreground': !isAssistant,
                'bg-primary text-primary-foreground': isAssistant,
              }
            )}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            {isAssistant && message.content.length > 1 && (
                <div className="mt-2 pt-2 border-t border-primary-foreground/20 flex justify-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                        onClick={handleTextToSpeech}
                    >
                        {isPlaying ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        <span className="sr-only">{isPlaying ? t('ttsStop') : t('ttsReadAloud')}</span>
                    </Button>
                </div>
            )}
          </div>
        )}
        
        {message.imageUrl && (
          <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border bg-muted">
            <NextImage
              src={message.imageUrl}
              alt={message.content || 'Generated image'}
              fill
              className="object-cover"
              data-ai-hint="generative art"
            />
          </div>
        )}

        {message.analysisReport && (
          <Card className="bg-card text-card-foreground">
            <CardHeader>
              <CardTitle className="text-base">{t('loanAnalysisReportTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold mb-1">{t('summary')}</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{message.analysisReport.summary}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t('prediction')}</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{message.analysisReport.prediction}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">{t('eligibility')}</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{message.analysisReport.eligibility}</p>
              </div>
              <Button onClick={() => onDownloadLoanPdf(message.analysisReport)} variant="secondary" size="sm">
                <Download className="mr-2 h-4 w-4" />
                {t('downloadPdf')}
              </Button>
            </CardContent>
          </Card>
        )}
        
        {message.chart && <GeneratedChart chart={message.chart} />}

        {message.financialReport && (
          <>
            <Card className="bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="text-base">{t('financialAnalysisReportTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold mb-1">{t('summary')}</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{message.financialReport.summary}</p>
                </div>
                {message.financialReport.trendsAndGraphs && (
                  <div>
                    <h3 className="font-semibold mb-1">{t('trendsAndGraphsTitle')}</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{message.financialReport.trendsAndGraphs}</p>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold mb-1">{t('prediction')}</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{message.financialReport.prediction}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t('creditScoreAssessment')}</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{message.financialReport.creditScorePrediction}</p>
                </div>
                {message.financialReport.identifiedFlaws && message.financialReport.identifiedFlaws.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-1">{t('identifiedFlawsTitle')}</h3>
                    <ul className="list-none space-y-2 pl-0">
                      {message.financialReport.identifiedFlaws.map((flaw, index) => (
                        <li key={index} className="flex items-start">
                          <span className="h-2 w-2 mt-1.5 mr-3 shrink-0 rounded-full bg-red-500"></span>
                          <span className="text-muted-foreground">{flaw}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                 <Button onClick={() => onDownloadFinancialReportPdf(message.financialReport)} variant="secondary" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  {t('downloadPdf')}
                </Button>
              </CardContent>
            </Card>
            {message.financialReport.keyMetrics && message.financialReport.keyMetrics.length > 0 && (
              <FinancialReportChart 
                data={message.financialReport.keyMetrics}
                revenueLabel={t('revenue')}
                netIncomeLabel={t('netIncome')}
              />
            )}
          </>
        )}
      </div>
      {!isAssistant && (
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback>
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-4 animate-in fade-in">
      <AbdullahAvatar className="w-8 h-8 shrink-0" />
      <div className="bg-primary text-primary-foreground rounded-lg p-3 shadow-sm flex items-center space-x-1">
        <span className="w-2 h-2 bg-primary-foreground/50 rounded-full animate-pulse delay-0 duration-1000"></span>
        <span className="w-2 h-2 bg-primary-foreground/50 rounded-full animate-pulse delay-200 duration-1000"></span>
        <span className="w-2 h-2 bg-primary-foreground/50 rounded-full animate-pulse delay-400 duration-1000"></span>
      </div>
    </div>
  );
}


function GeneratedChart({ chart }: { chart: NonNullable<Message['chart']> }) {
  const {t} = useLanguage();

  const chartColors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--primary))',
  ];

  const formatCurrency = (value: number) => {
    if (typeof value !== 'number') return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value);
  };
  
  const transformedChartData = chart.data.labels.map((label, index) => {
    const dataPoint: { [key: string]: string | number } = { name: label };
    chart.data.datasets.forEach(dataset => {
      dataPoint[dataset.label] = dataset.data[index];
    });
    return dataPoint;
  });

  return (
    <Card className="bg-card text-card-foreground">
       <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {chart.type === 'bar' ? <BarChart className="h-5 w-5 text-primary" /> : <PieChart className="h-5 w-5 text-primary" />}
            {chart.title}
          </CardTitle>
        </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          {chart.type === 'bar' ? (
            <RechartsBarChart data={transformedChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCurrency} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
                formatter={(value: number) => formatCurrency(value)}
                cursor={{ fill: 'hsl(var(--accent))' }}
              />
              <Legend wrapperStyle={{fontSize: "12px", paddingTop: "10px"}} />
              {chart.data.datasets.map((dataset, index) => (
                <Bar key={dataset.label} dataKey={dataset.label} fill={chartColors[index % chartColors.length]} radius={[4, 4, 0, 0]} />
              ))}
            </RechartsBarChart>
          ) : (
             <RechartsPieChart>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
              />
              <Legend wrapperStyle={{fontSize: "12px", paddingTop: "10px"}} />
              <Pie
                data={transformedChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey={chart.data.datasets[0].label}
                nameKey="name"
              >
                {transformedChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
            </RechartsPieChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
