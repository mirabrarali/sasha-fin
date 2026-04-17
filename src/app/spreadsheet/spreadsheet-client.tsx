'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  FileUp,
  Download,
  MessageSquare,
  Bot,
  Loader2,
  FileText,
  BarChart3,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { LanguageToggle } from '@/components/language-toggle';
import { ChatbotStatus } from '@/components/abdullah-status';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import {
  spreadsheetAssistant,
  type SpreadsheetAssistantOutput,
} from '@/ai/flows/spreadsheet-assistant';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const Bar = dynamic(() => import('react-chartjs-2').then((mod) => mod.Bar), { ssr: false });
const Line = dynamic(() => import('react-chartjs-2').then((mod) => mod.Line), { ssr: false });
const Pie = dynamic(() => import('react-chartjs-2').then((mod) => mod.Pie), { ssr: false });

type Row = Record<string, string>;
type ChatMessage = { role: 'user' | 'assistant'; content: string };
type AssistantMode = 'conversation' | 'analysis' | 'report' | 'chart';
type RenderedChart = {
  id: string;
  type: 'bar' | 'line' | 'pie';
  title: string;
  xKey: string;
  yKey: string;
};

const FILE_ACCEPT = '.xlsx,.xls,.csv,.tsv,.txt,.json,.jrn';
const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

function normalizeCellValue(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

function parseDelimitedText(text: string): { columns: string[]; rows: Row[] } {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((x) => x.trimEnd())
    .filter((x) => x.length > 0);
  if (!lines.length) return { columns: [], rows: [] };

  const delim = lines[0]!.includes('\t') ? '\t' : ',';
  const toCells = (line: string) => line.split(delim).map((x) => x.trim());
  const header = toCells(lines[0]!);
  const columns = header.map((h, i) => h || `Column ${i + 1}`);
  const rows = lines.slice(1).map((line) => {
    const row: Row = {};
    const cells = toCells(line);
    columns.forEach((col, idx) => {
      row[col] = cells[idx] ?? '';
    });
    return row;
  });
  return { columns, rows };
}

function parseJrnLikeText(text: string): { columns: string[]; rows: Row[] } {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((line) => line.trim().length > 0);
  if (!lines.length) return { columns: [], rows: [] };

  const headerIdx = lines.findIndex((line) => line.startsWith('!TRNS') || line.startsWith('!SPL'));
  if (headerIdx >= 0) {
    const header = lines[headerIdx]!.replace(/^!/, '').split('\t').map((x) => x.trim());
    const columns = header.map((h, i) => h || `Field ${i + 1}`);
    const rows: Row[] = [];
    for (const line of lines.slice(headerIdx + 1)) {
      if (line.startsWith('!') || line.toUpperCase().includes('ENDTRNS')) continue;
      const cells = line.split('\t');
      const row: Row = {};
      columns.forEach((col, i) => {
        row[col] = cells[i] ?? '';
      });
      rows.push(row);
    }
    return { columns, rows };
  }
  return parseDelimitedText(text);
}

async function generateAndDownloadPdf(element: HTMLElement, fileName: string): Promise<boolean> {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${fileName.replace(/\s+/g, '_')}_AI_Report.pdf`);
    return true;
  } catch (error) {
    console.error('Report PDF generation failed:', error);
    return false;
  }
}

function normalizeReplyText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return trimmed;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof parsed.reply === 'string') return parsed.reply;
  } catch {
    const m =
      trimmed.match(/["']reply["']\s*:\s*"([\s\S]*?)"\s*(?:,|})/i) ??
      trimmed.match(/["']reply["']\s*:\s*'([\s\S]*?)'\s*(?:,|})/i);
    if (m?.[1]) return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
  }
  return trimmed;
}

function buildChartData(rows: Row[], config: RenderedChart): { labels: string[]; values: number[] } | null {
  if (!config.xKey || !config.yKey) return null;

  if (config.type === 'pie') {
    const totals = new Map<string, number>();
    for (const row of rows) {
      const label = String(row[config.xKey] ?? '').trim();
      const value = Number(String(row[config.yKey] ?? '').replace(/,/g, ''));
      if (!label || !Number.isFinite(value)) continue;
      totals.set(label, (totals.get(label) ?? 0) + value);
    }
    const labels = Array.from(totals.keys()).slice(0, 12);
    const values = labels.map((label) => totals.get(label) ?? 0);
    return labels.length && values.length ? { labels, values } : null;
  }

  const labels: string[] = [];
  const values: number[] = [];
  for (const row of rows) {
    const label = String(row[config.xKey] ?? '').trim();
    const value = Number(String(row[config.yKey] ?? '').replace(/,/g, ''));
    if (!label || !Number.isFinite(value)) continue;
    labels.push(label);
    values.push(value);
    if (labels.length >= 28) break;
  }
  return labels.length && values.length ? { labels, values } : null;
}

export default function SpreadsheetClient() {
  const { t, language, dir } = useLanguage();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [sheetName, setSheetName] = useState('Sheet1');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<NonNullable<SpreadsheetAssistantOutput['edits']>>([]);
  const [reportMarkdown, setReportMarkdown] = useState('');
  const [chartSuggestions, setChartSuggestions] = useState<NonNullable<SpreadsheetAssistantOutput['chartSuggestions']>>([]);
  const [renderedCharts, setRenderedCharts] = useState<RenderedChart[]>([]);
  const [chartBuilderOpen, setChartBuilderOpen] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [chartTitle, setChartTitle] = useState('');
  const [chartXKey, setChartXKey] = useState('');
  const [chartYKey, setChartYKey] = useState('');
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const previewRows = useMemo(() => rows.slice(0, 200), [rows]);

  const onCellChange = (rowIdx: number, col: string, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      const current = next[rowIdx] ? { ...next[rowIdx] } : {};
      current[col] = value;
      next[rowIdx] = current;
      return next;
    });
  };

  const resetWorkspace = () => {
    setSheetName('Sheet1');
    setColumns([]);
    setRows([]);
    setMessages([]);
    setPrompt('');
    setPendingEdits([]);
    setReportMarkdown('');
    setChartSuggestions([]);
    setRenderedCharts([]);
    setChartBuilderOpen(false);
    setChartType('bar');
    setChartTitle('');
    setChartXKey('');
    setChartYKey('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const importFile = async (file: File) => {
    setUploadBusy(true);
    try {
      const lower = file.name.toLowerCase();
      setSheetName(file.name.replace(/\.[^.]+$/, '') || 'Sheet1');
      let loadedColumns: string[] = [];
      let loadedRows: Row[] = [];

      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array', cellDates: true, raw: false });
        const firstSheetName = wb.SheetNames[0];
        if (!firstSheetName) throw new Error('No sheets found in the workbook.');
        const ws = wb.Sheets[firstSheetName];
        const matrix = XLSX.utils.sheet_to_json<Array<string | number | boolean | null>>(ws, {
          header: 1,
          defval: '',
          raw: false,
        });
        if (!matrix.length) throw new Error('Sheet is empty.');
        const header = (matrix[0] ?? []).map((v, i) => normalizeCellValue(v) || `Column ${i + 1}`);
        const newRows = matrix.slice(1).map((line) => {
          const row: Row = {};
          header.forEach((col, idx) => {
            row[col] = normalizeCellValue((line as unknown[])[idx]);
          });
          return row;
        });
        loadedColumns = header;
        loadedRows = newRows;
      } else if (lower.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const list: Array<Record<string, unknown>> = Array.isArray(parsed) ? parsed : parsed?.rows ?? [];
        if (!Array.isArray(list) || !list.length) throw new Error('JSON must contain a non-empty array of row objects.');
        const inferredColumns = Array.from(new Set(list.flatMap((obj) => Object.keys(obj))));
        const newRows = list.map((obj) => {
          const row: Row = {};
          inferredColumns.forEach((col) => {
            row[col] = normalizeCellValue(obj[col]);
          });
          return row;
        });
        loadedColumns = inferredColumns;
        loadedRows = newRows;
      } else {
        const text = await file.text();
        const parsed = lower.endsWith('.jrn') ? parseJrnLikeText(text) : parseDelimitedText(text);
        if (!parsed.columns.length) throw new Error('No columns found in uploaded file.');
        loadedColumns = parsed.columns;
        loadedRows = parsed.rows;
      }

      setColumns(loadedColumns);
      setRows(loadedRows);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: t('spreadsheetLoadedMessage', { rows: loadedRows.length, cols: loadedColumns.length }),
        },
      ]);
      toast({ title: t('spreadsheetImportSuccess') });
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('spreadsheetImportFailedDesc');
      toast({ variant: 'destructive', title: t('spreadsheetImportFailedTitle'), description: msg });
    } finally {
      setUploadBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await importFile(file);
  };

  const exportCsv = () => {
    if (!columns.length) return;
    const csvRows = [
      columns.join(','),
      ...rows.map((row) =>
        columns
          .map((col) => {
            const cell = String(row[col] ?? '');
            if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
              return `"${cell.replaceAll('"', '""')}"`;
            }
            return cell;
          })
          .join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sheetName || 'sheet'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXlsx = () => {
    if (!columns.length) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1');
    XLSX.writeFile(wb, `${sheetName || 'sheet'}.xlsx`);
  };

  const runAssistant = async (mode: AssistantMode) => {
    if (!columns.length) {
      toast({ variant: 'destructive', title: t('spreadsheetNoDataTitle'), description: t('spreadsheetNoDataDesc') });
      return;
    }
    const defaultPromptByMode: Record<AssistantMode, string> = {
      conversation: t('spreadsheetDefaultPrompt'),
      analysis: t('spreadsheetDefaultPrompt'),
      report: t('spreadsheetReportDefaultPrompt'),
      chart: t('spreadsheetChartDefaultPrompt'),
    };
    const userRequest = prompt.trim() || defaultPromptByMode[mode];
    const nextMessages = [...messages, { role: 'user', content: userRequest } as ChatMessage];
    setAiBusy(true);
    setMessages(nextMessages);

    try {
      const response = await spreadsheetAssistant({
        language,
        mode,
        userRequest,
        messages: nextMessages,
        sheet: { name: sheetName, columns, rows },
      });

      const cleanedReply = normalizeReplyText(response.reply);
      setMessages((prev) => [...prev, { role: 'assistant', content: cleanedReply }]);
      setPendingEdits(response.edits ?? []);
      setReportMarkdown(response.reportMarkdown ?? '');
      setChartSuggestions(response.chartSuggestions ?? []);
      setPrompt('');
      return response;
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('spreadsheetAiFailedDesc');
      toast({ variant: 'destructive', title: t('spreadsheetAiFailedTitle'), description: msg });
    } finally {
      setAiBusy(false);
      return null;
    }
  };

  const applyEdits = () => {
    if (!pendingEdits.length) return;
    setRows((prev) => {
      const next = [...prev];
      for (const edit of pendingEdits) {
        if (!next[edit.rowIndex]) continue;
        next[edit.rowIndex] = { ...next[edit.rowIndex], [edit.colName]: edit.newValue };
      }
      return next;
    });
    setPendingEdits([]);
    toast({ title: t('spreadsheetEditsApplied') });
  };

  const openChartBuilder = async () => {
    if (!columns.length) {
      toast({ variant: 'destructive', title: t('spreadsheetNoDataTitle'), description: t('spreadsheetNoDataDesc') });
      return;
    }
    let nextSuggestions = chartSuggestions;
    if (!nextSuggestions.length) {
      const response = await runAssistant('chart');
      nextSuggestions = response?.chartSuggestions ?? [];
    }
    const suggested = nextSuggestions[0];
    setChartType((suggested?.type as 'bar' | 'line' | 'pie' | undefined) ?? 'bar');
    setChartTitle(suggested?.title ?? t('spreadsheetCustomChartTitle'));
    setChartXKey(suggested?.xKey ?? columns[0] ?? '');
    setChartYKey(suggested?.yKey ?? columns[1] ?? columns[0] ?? '');
    setChartBuilderOpen(true);
  };

  const useSuggestion = (idx: number) => {
    const suggestion = chartSuggestions[idx];
    if (!suggestion) return;
    setChartType(suggestion.type as 'bar' | 'line' | 'pie');
    setChartTitle(suggestion.title || t('spreadsheetCustomChartTitle'));
    setChartXKey(suggestion.xKey || columns[0] || '');
    setChartYKey(suggestion.yKey || columns[1] || columns[0] || '');
    setChartBuilderOpen(true);
  };

  const addCustomChart = () => {
    if (!chartXKey || !chartYKey) {
      toast({ variant: 'destructive', title: t('spreadsheetAiFailedTitle'), description: t('spreadsheetChartNeedKeys') });
      return;
    }
    const nextChart: RenderedChart = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: chartType,
      title: chartTitle.trim() || `${chartYKey} by ${chartXKey}`,
      xKey: chartXKey,
      yKey: chartYKey,
    };
    setRenderedCharts((prev) => [...prev, nextChart]);
    setChartBuilderOpen(false);
  };

  const ensureChartForReport = (suggestions: NonNullable<SpreadsheetAssistantOutput['chartSuggestions']>) => {
    if (renderedCharts.length) return renderedCharts;
    const fromSuggestions = suggestions
      .filter((s) => s.xKey && s.yKey)
      .slice(0, 2)
      .map((s, idx) => ({
        id: `suggested-${idx}-${Date.now()}`,
        type: s.type as 'bar' | 'line' | 'pie',
        title: s.title || `${s.yKey} by ${s.xKey}`,
        xKey: s.xKey,
        yKey: s.yKey,
      }));
    if (fromSuggestions.length) {
      setRenderedCharts(fromSuggestions);
      return fromSuggestions;
    }
    if (columns.length >= 2) {
      const fallback: RenderedChart[] = [
        {
          id: `fallback-${Date.now()}`,
          type: 'bar',
          title: `${columns[1]} by ${columns[0]}`,
          xKey: columns[0]!,
          yKey: columns[1]!,
        },
      ];
      setRenderedCharts(fallback);
      return fallback;
    }
    return [];
  };

  const generateReportAndDownload = async () => {
    const response = await runAssistant('report');
    if (!response) return;
    const usedCharts = ensureChartForReport(response.chartSuggestions ?? []);
    if (response.reportMarkdown) setReportMarkdown(response.reportMarkdown);
    if (response.chartSuggestions?.length) setChartSuggestions(response.chartSuggestions);

    setIsDownloadingReport(true);
    setTimeout(async () => {
      const node = reportRef.current;
      if (!node) {
        setIsDownloadingReport(false);
        return;
      }
      const ok = await generateAndDownloadPdf(node, `${sheetName || 'spreadsheet'}_report`);
      if (!ok) {
        toast({ variant: 'destructive', title: t('spreadsheetReportDownloadFailed') });
      }
      if (!usedCharts.length) {
        toast({ variant: 'destructive', title: t('spreadsheetChartNoData') });
      }
      setIsDownloadingReport(false);
    }, 420);
  };

  return (
    <div className="flex flex-col h-screen bg-muted/40 text-foreground" dir={dir}>
      <input ref={inputRef} type="file" className="hidden" accept={FILE_ACCEPT} onChange={handleFileChange} />

      <header className="grid grid-cols-3 items-center p-4 border-b shrink-0 bg-background">
        <div className="justify-self-start flex items-center gap-2">
          <SidebarTrigger />
        </div>
        <h1 className="text-xl font-semibold tracking-tight justify-self-center">{t('spreadsheetTitle')}</h1>
        <div className="justify-self-end flex items-center gap-2">
          <ChatbotStatus />
          <LanguageToggle />
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-[1500px] mx-auto grid grid-cols-1 xl:grid-cols-5 gap-4">
          <Card className="xl:col-span-3">
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => inputRef.current?.click()} disabled={uploadBusy}>
                  {uploadBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                  {t('spreadsheetImport')}
                </Button>
                <Button variant="outline" onClick={exportCsv} disabled={!columns.length}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('spreadsheetExportCsv')}
                </Button>
                <Button variant="outline" onClick={exportXlsx} disabled={!columns.length}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('spreadsheetExportXlsx')}
                </Button>
                <Button variant="ghost" onClick={resetWorkspace}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('newSessionButton')}
                </Button>
              </div>
              <CardTitle>{sheetName}</CardTitle>
              <CardDescription>{t('spreadsheetWorkspaceDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {!columns.length ? (
                <div className="p-8 text-center border rounded-md bg-background/60">
                  <p className="text-sm text-muted-foreground">{t('spreadsheetEmptyHint')}</p>
                </div>
              ) : (
                <div className="overflow-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/70 sticky top-0">
                      <tr>
                        <th className="text-left p-2 border-r">#</th>
                        {columns.map((col) => (
                          <th key={col} className="text-left p-2 border-r min-w-[140px]">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, rowIdx) => (
                        <tr key={`${rowIdx}`} className="border-t">
                          <td className="p-2 text-muted-foreground border-r">{rowIdx + 1}</td>
                          {columns.map((col) => (
                            <td key={`${rowIdx}-${col}`} className="p-1 border-r">
                              <Input
                                value={row[col] ?? ''}
                                onChange={(e) => onCellChange(rowIdx, col, e.target.value)}
                                className="h-8"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {rows.length > previewRows.length ? (
                <p className="text-xs text-muted-foreground mt-2">
                  {t('spreadsheetPreviewNote', { shown: previewRows.length, total: rows.length })}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="xl:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  {t('spreadsheetAiTitle')}
                </CardTitle>
                <CardDescription>{t('spreadsheetAiDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="max-h-52 overflow-auto space-y-2 border rounded-md p-3 bg-background/60">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('spreadsheetAiEmpty')}</p>
                  ) : (
                    messages.map((msg, i) => (
                      <div key={`${msg.role}-${i}`} className="text-sm">
                        <span className="font-medium">{msg.role === 'user' ? t('spreadsheetYou') : t('spreadsheetAi')}</span>
                        <span>: {msg.content}</span>
                      </div>
                    ))
                  )}
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t('spreadsheetPromptPlaceholder')}
                  rows={4}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => runAssistant('conversation')} disabled={aiBusy}>
                    {aiBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                    {t('spreadsheetAskAi')}
                  </Button>
                  <Button variant="outline" onClick={generateReportAndDownload} disabled={aiBusy || isDownloadingReport}>
                    {isDownloadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    {t('spreadsheetReport')}
                  </Button>
                  <Button variant="outline" onClick={openChartBuilder} disabled={aiBusy}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    {t('spreadsheetCharts')}
                  </Button>
                </div>
                {pendingEdits.length ? (
                  <div className="rounded-md border p-3 bg-emerald-50/30 dark:bg-emerald-900/10">
                    <p className="text-sm mb-2">{t('spreadsheetPendingEdits', { count: pendingEdits.length })}</p>
                    <Button size="sm" onClick={applyEdits}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {t('spreadsheetApplyEdits')}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {reportMarkdown ? (
              <Card ref={reportRef}>
                <CardHeader>
                  <CardTitle>{t('spreadsheetGeneratedReport')}</CardTitle>
                  <CardDescription>{isDownloadingReport ? t('spreadsheetReportDownloading') : t('spreadsheetDownloadReportPdf')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm">{reportMarkdown}</pre>
                  {renderedCharts.length ? (
                    <div className="mt-4 space-y-4">
                      {renderedCharts.map((cfg) => {
                        const dataPair = buildChartData(rows, cfg);
                        if (!dataPair) return null;
                        const chartData = {
                          labels: dataPair.labels,
                          datasets: [
                            {
                              label: cfg.yKey,
                              data: dataPair.values,
                              backgroundColor: CHART_COLORS,
                              borderColor: '#2563eb',
                            },
                          ],
                        };
                        return (
                          <div key={cfg.id} className="space-y-2">
                            <p className="text-sm font-medium">{cfg.title}</p>
                            <div className="h-[220px] bg-background/60 p-2 rounded-md">
                              {cfg.type === 'bar' ? <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} /> : null}
                              {cfg.type === 'line' ? <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} /> : null}
                              {cfg.type === 'pie' ? <Pie data={chartData} options={{ responsive: true, maintainAspectRatio: false }} /> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {chartSuggestions.length ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t('spreadsheetChartSuggestions')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {chartSuggestions.map((c, idx) => {
                    const dataPair = buildChartData(rows, {
                      id: `suggested-preview-${idx}`,
                      type: c.type,
                      title: c.title,
                      xKey: c.xKey,
                      yKey: c.yKey,
                    });
                    if (!dataPair) {
                      return (
                        <div key={`${c.title}-${idx}`} className="text-sm text-muted-foreground">
                          {c.title}: {t('spreadsheetChartNoData')}
                        </div>
                      );
                    }
                    const chartData = {
                      labels: dataPair.labels,
                      datasets: [
                        {
                          label: c.yKey,
                          data: dataPair.values,
                          backgroundColor: CHART_COLORS,
                          borderColor: '#2563eb',
                        },
                      ],
                    };

                    return (
                      <div key={`${c.title}-${idx}`} className="space-y-2">
                        <p className="text-sm font-medium">{c.title}</p>
                        <Button size="sm" variant="outline" onClick={() => useSuggestion(idx)}>
                          {t('spreadsheetUseSuggestion')}
                        </Button>
                        <div className="h-[220px]">
                          {c.type === 'bar' ? <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} /> : null}
                          {c.type === 'line' ? <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} /> : null}
                          {c.type === 'pie' ? <Pie data={chartData} options={{ responsive: true, maintainAspectRatio: false }} /> : null}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </main>

      <Dialog open={chartBuilderOpen} onOpenChange={setChartBuilderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('spreadsheetOpenChartBuilder')}</DialogTitle>
            <DialogDescription>{t('spreadsheetChartBuilderDesc')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t('spreadsheetChartTitle')}</Label>
              <Input value={chartTitle} onChange={(e) => setChartTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t('spreadsheetChartType')}</Label>
              <Select value={chartType} onValueChange={(value) => setChartType(value as 'bar' | 'line' | 'pie')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="pie">Pie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('spreadsheetXAxis')}</Label>
              <Select value={chartXKey} onValueChange={setChartXKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={`x-${col}`} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('spreadsheetYAxis')}</Label>
              <Select value={chartYKey} onValueChange={setChartYKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={`y-${col}`} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setChartBuilderOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={addCustomChart}>{t('spreadsheetCreateChart')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="text-xs text-muted-foreground p-3 border-t bg-background">
        <div className="max-w-[1500px] mx-auto flex items-center justify-between">
          <span>{t('spreadsheetFooterNote')}</span>
          <Link href="/about" className="underline underline-offset-4">
            {t('aboutTitle')}
          </Link>
        </div>
      </footer>
    </div>
  );
}

