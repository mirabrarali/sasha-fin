'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/context/language-context';

const BAR_COLORS = {
  revenue: '#2563eb',
  netIncome: '#059669',
} as const;

const PIE_PALETTE = ['#2563eb', '#0891b2', '#16a34a', '#ca8a04', '#9333ea', '#dc2626', '#ea580c', '#4f46e5'];

export interface FinancialMetricRow {
  name: string;
  revenue?: number;
  netIncome?: number;
}

interface FinancialReportChartsProps {
  data: FinancialMetricRow[];
  revenueLabel: string;
  netIncomeLabel: string;
  barTitle?: string;
  pieTitle?: string;
  isAnimationActive?: boolean;
  /** Slightly smaller charts (e.g. PDF capture area). */
  compact?: boolean;
  /** Optional footnote under pie chart (e.g. PDF language-specific note). */
  footnote?: string;
}

function buildPieSlices(rows: FinancialMetricRow[]) {
  return rows.map((row) => {
    const v =
      typeof row.revenue === 'number' && !Number.isNaN(row.revenue) && row.revenue !== 0
        ? Math.abs(row.revenue)
        : typeof row.netIncome === 'number' && !Number.isNaN(row.netIncome) && row.netIncome !== 0
          ? Math.abs(row.netIncome)
          : 0;
    return { name: row.name, value: v };
  });
}

export function FinancialReportCharts({
  data,
  revenueLabel,
  netIncomeLabel,
  barTitle,
  pieTitle,
  isAnimationActive = true,
  compact = false,
  footnote,
}: FinancialReportChartsProps) {
  const { t } = useLanguage();

  const barData = useMemo(
    () =>
      data.map((row) => ({
        name: row.name,
        revenue: typeof row.revenue === 'number' && !Number.isNaN(row.revenue) ? row.revenue : 0,
        netIncome: typeof row.netIncome === 'number' && !Number.isNaN(row.netIncome) ? row.netIncome : 0,
      })),
    [data]
  );

  const pieData = useMemo(() => {
    const slices = buildPieSlices(data);
    const positive = slices.filter((s) => s.value > 0);
    if (positive.length > 0) return positive;
    return slices.map((s) => ({ name: s.name, value: s.value === 0 ? 1 : s.value }));
  }, [data]);

  const formatCompact = (value: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '';
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const chartHeight = compact ? 260 : 320;

  const barTitleFinal = barTitle ?? t('financialPerformanceTitle');
  const pieTitleFinal = pieTitle ?? t('chartCompositionTitle');

  const pieTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { name?: string; value?: number; payload?: { name: string; value: number } }[];
  }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    if (!p) return null;
    const total = pieData.reduce((s, x) => s + x.value, 0) || 1;
    const pct = ((p.value / total) * 100).toFixed(1);
    return (
      <div className="rounded-md border bg-background px-2 py-1.5 text-xs shadow-sm">
        <div className="font-medium">{p.name}</div>
        <div className="text-muted-foreground">
          {formatCompact(p.value)} ({pct}%)
        </div>
      </div>
    );
  };

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="min-w-0 overflow-hidden border bg-card text-card-foreground shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold tracking-tight">{barTitleFinal}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="w-full min-w-0" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={chartHeight}>
              <BarChart data={barData} margin={{ top: 12, right: 12, left: 4, bottom: 8 }} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={formatCompact}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    fontSize: 12,
                  }}
                  formatter={(value: number) => formatCompact(value)}
                  cursor={{ fill: 'hsl(var(--accent) / 0.35)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar
                  dataKey="revenue"
                  name={revenueLabel}
                  fill={BAR_COLORS.revenue}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={isAnimationActive}
                  maxBarSize={48}
                />
                <Bar
                  dataKey="netIncome"
                  name={netIncomeLabel}
                  fill={BAR_COLORS.netIncome}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={isAnimationActive}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: BAR_COLORS.revenue }} />
              {revenueLabel}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: BAR_COLORS.netIncome }} />
              {netIncomeLabel}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden border bg-card text-card-foreground shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold tracking-tight">{pieTitleFinal}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="w-full min-w-0" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={chartHeight}>
              <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={compact ? 44 : 56}
                  outerRadius={compact ? 86 : 102}
                  paddingAngle={2}
                  labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  isAnimationActive={isAnimationActive}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`slice-${index}`} fill={PIE_PALETTE[index % PIE_PALETTE.length]!} stroke="hsl(var(--background))" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip content={pieTooltip} />
                <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            {footnote ?? t('chartShareNote')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/** @deprecated Use FinancialReportCharts — kept for any stale imports. */
export function FinancialReportChart(props: FinancialReportChartsProps) {
  return <FinancialReportCharts {...props} />;
}
