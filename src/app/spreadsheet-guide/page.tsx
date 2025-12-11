
import type { Metadata } from 'next';
import SpreadsheetGuideClient from './spreadsheet-guide-client';

export const metadata: Metadata = {
    title: 'Spreadsheet Guide',
    description: 'Learn how to use the Agentic Spreadsheet. Discover core capabilities, example commands, and the full function library.',
    keywords: ['spreadsheet guide', 'sasha spreadsheet', 'agentic ai tutorial', 'spreadsheet commands', 'spreadsheet functions'],
};

export default function SpreadsheetGuidePage() {
    return <SpreadsheetGuideClient />;
}
