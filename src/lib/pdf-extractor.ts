/**
 * File Text Extraction Utility
 * Extracts text content from base64-encoded PDF, CSV, and XLSX documents
 */

import * as XLSX from 'xlsx';

// pdf-parse uses CommonJS export without default, import as namespace
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export interface FileExtractionResult {
    text: string;
    type: string;
    metadata?: any;
}

/**
 * Extracts text from a base64-encoded file
 * @param base64DataUri - Data URI of the file
 * @returns Extracted text and metadata
 */
export async function extractTextFromFile(base64DataUri: string): Promise<FileExtractionResult> {
    const match = base64DataUri.match(/^data:(.*);base64,(.*)$/);
    if (!match) {
        throw new Error('Invalid data URI format');
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    try {
        if (mimeType === 'application/pdf') {
            const data = await pdfParse(buffer);
            return {
                text: data.text,
                type: 'pdf',
                metadata: { numPages: data.numpages, info: data.info }
            };
        }

        if (mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') {
            const text = buffer.toString('utf-8');
            return {
                text: text,
                type: 'csv'
            };
        }

        if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            let text = '';
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                text += `Sheet: ${sheetName}\n`;
                text += XLSX.utils.sheet_to_csv(worksheet);
                text += '\n\n';
            });
            return {
                text: text,
                type: 'xlsx'
            };
        }

        // Default: try to read as text
        return {
            text: buffer.toString('utf-8'),
            type: 'text'
        };
    } catch (error) {
        console.error('File extraction error:', error);
        throw new Error(`Failed to extract text from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Cleans and formats extracted text
 * @param text - Raw extracted text
 * @returns Cleaned text
 */
export function cleanText(text: string): string {
    return text
        .replace(/\r/g, '') // Remove carriage returns
        .replace(/\t/g, ' ') // Replace tabs with spaces
        .replace(/ +/g, ' ') // Replace multiple spaces with single space
        .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newline
        .trim();
}

/**
 * Extracts text from a base64-encoded PDF (Legacy support)
 */
export async function extractTextFromPDF(base64PDF: string) {
    const result = await extractTextFromFile(base64PDF);
    return {
        text: result.text,
        numPages: result.metadata?.numPages || 0,
        info: result.metadata?.info
    };
}

/**
 * Cleans and formats extracted PDF text (Legacy support)
 */
export function cleanPDFText(text: string): string {
    return cleanText(text);
}
