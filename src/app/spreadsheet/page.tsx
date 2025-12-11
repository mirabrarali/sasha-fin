
import type { Metadata } from 'next';
import SpreadsheetClient from './spreadsheet-client';

export const metadata: Metadata = {
    title: 'Agentic Spreadsheet',
    description: 'Use an intelligent spreadsheet powered by Sasha. Automate tasks, generate financial models, and analyze data using natural language commands.',
    keywords: ['agentic spreadsheet', 'ai spreadsheet', 'sasha spreadsheet', 'financial modeling', 'data analysis', 'natural language commands'],
};

export default function SpreadsheetPage() {
    return <SpreadsheetClient />;
}
