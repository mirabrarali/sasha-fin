/**
 * File text extraction for PDF, CSV, and Excel.
 * PDF uses `unpdf` loaded only inside the PDF branch (dynamic import) so Vercel serverless
 * never pulls `pdf-parse` / PDF.js canvas / DOMMatrix into the bundle.
 */

import * as XLSX from 'xlsx';

export interface FileExtractionResult {
    text: string;
    type: string;
    metadata?: { numPages?: number; info?: Record<string, unknown> };
}

function isPdfSignature(buf: Buffer): boolean {
    return buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-';
}

function isZipOfficeOpenXml(buf: Buffer): boolean {
    return (
        buf.length >= 4 &&
        buf[0] === 0x50 &&
        buf[1] === 0x4b &&
        (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07) &&
        (buf[3] === 0x04 || buf[3] === 0x06 || buf[3] === 0x08)
    );
}

function isOleCompoundFile(buf: Buffer): boolean {
    return buf.length >= 4 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0;
}

function bufferLooksLikeTextCsv(buf: Buffer): boolean {
    const n = Math.min(buf.length, 4096);
    if (n === 0) return false;
    for (let i = 0; i < n; i++) {
        if (buf[i] === 0) return false;
    }
    return true;
}

function tryExtractSpreadsheet(buffer: Buffer): string | null {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
        if (!workbook.SheetNames?.length) return null;
        let text = '';
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) continue;
            text += `Sheet: ${sheetName}\n`;
            text += XLSX.utils.sheet_to_csv(worksheet);
            text += '\n\n';
        }
        return text.trim().length > 0 ? text : null;
    } catch {
        return null;
    }
}

/** Dynamic import keeps `unpdf` (and its PDF.js build) out of the module graph until a PDF is parsed. */
async function extractPdfWithUnpdf(buffer: Buffer): Promise<FileExtractionResult> {
    const { extractText, getMeta } = await import('unpdf');
    const data = new Uint8Array(buffer);
    const result = await extractText(data, { mergePages: true });
    // Types say `mergePages: true` ⇒ string; widen so array handling stays valid at runtime.
    const raw = result.text as string | string[];
    const text = Array.isArray(raw) ? raw.join('\n') : raw;
    let info: Record<string, unknown> = {};
    try {
        const meta = await getMeta(data, { parseDates: false });
        info = { ...(meta.info ?? {}), ...(meta.metadata ?? {}) };
    } catch {
        // optional
    }
    return {
        text,
        type: 'pdf',
        metadata: { numPages: result.totalPages, info },
    };
}

/**
 * Extracts text from a base64 data URI (PDF, CSV, XLSX, etc.).
 */
export async function extractTextFromFile(base64DataUri: string): Promise<FileExtractionResult> {
    const match = base64DataUri.match(/^data:([^,]*);base64,([\s\S]*)$/);
    if (!match) {
        throw new Error('Invalid data URI format');
    }

    const mimeTypeRaw = (match[1] ?? '').trim().toLowerCase();
    const mimeBase = mimeTypeRaw.split(';')[0].trim();
    const buffer = Buffer.from(match[2], 'base64');

    try {
        if (mimeBase === 'application/pdf' || isPdfSignature(buffer)) {
            return await extractPdfWithUnpdf(buffer);
        }

        if (mimeBase === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            const sheetText = tryExtractSpreadsheet(buffer);
            if (sheetText) {
                return { text: sheetText, type: 'xlsx' };
            }
            throw new Error('Could not read Excel workbook (.xlsx).');
        }

        if (mimeBase === 'application/vnd.ms-excel') {
            const sheetText = tryExtractSpreadsheet(buffer);
            if (sheetText) {
                return { text: sheetText, type: 'xls' };
            }
            if (bufferLooksLikeTextCsv(buffer)) {
                return { text: buffer.toString('utf-8'), type: 'csv' };
            }
            throw new Error('Could not read Excel (.xls) or CSV from this file.');
        }

        if (mimeBase === 'text/csv' || mimeBase === 'application/csv' || mimeBase === 'text/plain') {
            return { text: buffer.toString('utf-8'), type: 'csv' };
        }

        if (mimeBase === 'application/octet-stream' || !mimeTypeRaw) {
            if (isPdfSignature(buffer)) {
                return await extractPdfWithUnpdf(buffer);
            }
            if (isZipOfficeOpenXml(buffer) || isOleCompoundFile(buffer)) {
                const sheetText = tryExtractSpreadsheet(buffer);
                if (sheetText) {
                    return { text: sheetText, type: 'xlsx' };
                }
                throw new Error('File looks like Excel but could not be read.');
            }
            if (bufferLooksLikeTextCsv(buffer)) {
                return { text: buffer.toString('utf-8'), type: 'csv' };
            }
            const sheetText = tryExtractSpreadsheet(buffer);
            if (sheetText) {
                return { text: sheetText, type: 'spreadsheet' };
            }
            return { text: buffer.toString('utf-8'), type: 'text' };
        }

        const fallbackSheet = tryExtractSpreadsheet(buffer);
        if (fallbackSheet) {
            return { text: fallbackSheet, type: 'spreadsheet' };
        }

        const asUtf8 = buffer.toString('utf-8');
        if (bufferLooksLikeTextCsv(buffer) && asUtf8.trim().length > 0) {
            return { text: asUtf8, type: 'csv' };
        }
        return { text: asUtf8, type: 'text' };
    } catch (error) {
        console.error('File extraction error:', error);
        throw new Error(`Failed to extract text from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function cleanText(text: string): string {
    return text
        .replace(/\r/g, '')
        .replace(/\t/g, ' ')
        .replace(/ +/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export async function extractTextFromPDF(base64PDF: string) {
    const result = await extractTextFromFile(base64PDF);
    return {
        text: result.text,
        numPages: result.metadata?.numPages ?? 0,
        info: result.metadata?.info,
    };
}

export function cleanPDFText(text: string): string {
    return cleanText(text);
}
