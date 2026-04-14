
'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import NextImage from 'next/image';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChatbotAvatar } from '@/components/abdullah-avatar';
import { User, Download, Loader2, BarChart, PieChart } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/context/language-context';
import { BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { parseStructuredFlaw, splitSummarySections } from '@/lib/financial-report-format';

const FinancialReportCharts = dynamic(
  () => import('./financial-report-chart').then((mod) => mod.FinancialReportCharts),
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
    criticalInsights?: string[];
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
  };
};

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onDownloadLoanPdf: (report: Message['analysisReport']) => void;
  onDownloadFinancialReportPdf: (report: Message['financialReport']) => void;
}

export function MessageList({ messages, isLoading, onDownloadLoanPdf, onDownloadFinancialReportPdf }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        {messages.map((message) => (
          <ChatMessage 
            key={message.id} 
            message={message} 
            onDownloadLoanPdf={onDownloadLoanPdf}
            onDownloadFinancialReportPdf={onDownloadFinancialReportPdf}
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
}: { 
  message: Message, 
  onDownloadLoanPdf: (report: Message['analysisReport']) => void; 
  onDownloadFinancialReportPdf: (report: Message['financialReport']) => void;
}) {
  const { t } = useLanguage();
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={cn('flex items-start gap-3 sm:gap-4 animate-in fade-in', {
        'justify-end': !isAssistant,
      })}
    >
      {isAssistant && <ChatbotAvatar className="w-8 h-8 shrink-0" />}
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
            <Card className="overflow-hidden border bg-card text-card-foreground shadow-sm">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-lg font-semibold tracking-tight">{t('financialAnalysisReportTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 text-sm">
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('summary')}</h3>
                  <div className="space-y-3">
                    {splitSummarySections(message.financialReport.summary).map((sec, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border bg-muted/20 p-4 shadow-sm break-inside-avoid"
                      >
                        <h4 className="text-sm font-semibold text-foreground">{sec.title}</h4>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{sec.body}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {message.financialReport.trendsAndGraphs && (
                  <div className="rounded-xl border bg-card p-4 break-inside-avoid">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('trendsAndGraphsTitle')}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {message.financialReport.trendsAndGraphs}
                    </p>
                  </div>
                )}

                {message.financialReport.keyMetrics && message.financialReport.keyMetrics.length > 0 && (
                  <div className="min-w-0 break-inside-avoid">
                    <FinancialReportCharts
                      data={message.financialReport.keyMetrics}
                      revenueLabel={t('revenue')}
                      netIncomeLabel={t('netIncome')}
                      barTitle={t('financialPerformanceTitle')}
                      pieTitle={t('chartCompositionTitle')}
                    />
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border bg-card p-4 break-inside-avoid">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('prediction')}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {message.financialReport.prediction}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-card p-4 break-inside-avoid">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('creditScoreAssessment')}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {message.financialReport.creditScorePrediction}
                    </p>
                  </div>
                </div>

                {(message.financialReport.criticalInsights?.length ?? 0) > 0 && (
                  <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 break-inside-avoid">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">{t('criticalInsightsTitle')}</h3>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">
                      {message.financialReport.criticalInsights!.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {message.financialReport.identifiedFlaws && message.financialReport.identifiedFlaws.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-destructive">{t('identifiedFlawsTitle')}</h3>
                    <div className="space-y-3">
                      {message.financialReport.identifiedFlaws.map((flaw, index) => {
                        const parsed = parseStructuredFlaw(flaw);
                        return (
                          <div
                            key={index}
                            className="rounded-xl border border-red-200/80 bg-red-50/40 p-4 dark:border-red-900/40 dark:bg-red-950/20 break-inside-avoid"
                          >
                            {parsed.severity && (
                              <span
                                className={
                                  parsed.severity === 'high'
                                    ? 'mb-2 inline-block rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white'
                                    : parsed.severity === 'medium'
                                      ? 'mb-2 inline-block rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white'
                                      : 'mb-2 inline-block rounded-full bg-slate-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white'
                                }
                              >
                                {parsed.severity}
                              </span>
                            )}
                            {parsed.headline && <p className="text-sm font-semibold text-foreground">{parsed.headline}</p>}
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{parsed.body}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Button onClick={() => onDownloadFinancialReportPdf(message.financialReport)} variant="secondary" size="sm" className="mt-2">
                  <Download className="mr-2 h-4 w-4" />
                  {t('downloadPdf')}
                </Button>
              </CardContent>
            </Card>
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
      <ChatbotAvatar className="w-8 h-8 shrink-0" />
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
