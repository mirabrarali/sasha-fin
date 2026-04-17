import type { Metadata } from 'next';
import SpreadsheetClient from './spreadsheet-client';

export const maxDuration = 180;

export const metadata: Metadata = {
  title: 'Spreadsheet Intelligence Workspace',
  description:
    'Import CSV/XLSX/JRN files, edit spreadsheet data, chat with AI, generate reports, and export results in a collaborative bilingual workspace.',
  keywords: ['spreadsheet ai', 'csv editor', 'xlsx analysis', 'financial spreadsheet', 'journal import', 'ai copilot'],
};

export default function SpreadsheetPage() {
  return <SpreadsheetClient />;
}

