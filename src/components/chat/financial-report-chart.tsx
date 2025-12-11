'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/context/language-context';

interface FinancialReportChartProps {
  data: {
    name: string;
    revenue?: number;
    netIncome?: number;
  }[];
  revenueLabel: string;
  netIncomeLabel: string;
  isAnimationActive?: boolean;
}

export function FinancialReportChart({ data, revenueLabel, netIncomeLabel, isAnimationActive = true }: FinancialReportChartProps) {
  const { t } = useLanguage();

  const formatCurrency = (value: number) => {
    if (typeof value !== 'number') return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value);
  };

  return (
    <Card className="bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="text-base">{t('financialPerformanceTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }} isAnimationActive={isAnimationActive}>
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
            <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name={revenueLabel} radius={[4, 4, 0, 0]} />
            <Bar dataKey="netIncome" fill="hsl(var(--chart-2))" name={netIncomeLabel} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
