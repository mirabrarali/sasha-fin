
import type { Metadata } from 'next';
import DataAnalyticsClient from './data-analytics-client';

export const metadata: Metadata = {
    title: 'Data Analytics Dashboard',
    description: 'Upload your data (CSV, Excel, PDF) and let Abdullah instantly generate an interactive dashboard with AI-powered insights and visualizations.',
    keywords: ['data analytics', 'business intelligence', 'ai dashboard', 'csv analysis', 'excel analysis', 'pdf data extraction'],
};

export default function DataAnalyticsPage() {
    return <DataAnalyticsClient />;
}
