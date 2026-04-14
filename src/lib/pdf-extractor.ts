/**
 * File text extraction for PDF, spreadsheets, and plain-text formats (CSV, JRN, JSON, etc.).
 * PDF uses a dynamic `unpdf` import so Vercel serverless does not load canvas-based PDF stacks.
 */

import 'server-only';

import * as XLSX from 'xlsx';

export interface FileExtractionResult {
    text: string;
    type: string;
    metadata?: { numPages?: number; info?: Record<string, unknown> };
}

/** Decode a browser FileReader data URI into buffer + normalized MIME (base type, no charset). */
export function parseDataUriToBuffer(dataUri: string): {
    mimeTypeRaw: string;
    mimeBase: string;
    buffer: Buffer;
} {
    const match = dataUri.match(/^data:([^,]*);base64,([\s\S]*)$/);
    if (!match) {
        throw new Error('Invalid data URI format');
    }
    const mimeTypeRaw = (match[1] ?? '').trim().toLowerCase();
    const mimeBase = mimeTypeRaw.split(';')[0].trim();
    const buffer = Buffer.from(match[2], 'base64');
    return { mimeTypeRaw, mimeBase, buffer };
}

export function isPdfSignature(buf: Buffer): boolean {
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

function decodeTextBuffer(buf: Buffer): string {
    if (buf.length === 0) return '';

    // UTF-8 BOM
    if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
        return buf.toString('utf8', 3);
    }

    // UTF-16 LE BOM
    if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
        try {
            return new TextDecoder('utf-16le').decode(buf.subarray(2));
        } catch {
            return buf.toString('utf8');
        }
    }

    // UTF-16 BE BOM
    if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
        try {
            const swapped = Buffer.from(buf.subarray(2));
            for (let i = 0; i + 1 < swapped.length; i += 2) {
                const first = swapped[i];
                swapped[i] = swapped[i + 1]!;
                swapped[i + 1] = first!;
            }
            return new TextDecoder('utf-16le').decode(swapped);
        } catch {
            return buf.toString('utf8');
        }
    }

    // Heuristic: alternating null bytes often indicates UTF-16 without BOM (common in text exports like .jrn).
    const sample = buf.subarray(0, Math.min(buf.length, 4096));
    let oddNulls = 0;
    let evenNulls = 0;
    for (let i = 0; i < sample.length; i++) {
        if (sample[i] === 0) {
            if (i % 2 === 0) evenNulls++;
            else oddNulls++;
        }
    }
    const threshold = Math.max(8, Math.floor(sample.length * 0.08));
    if (oddNulls > threshold || evenNulls > threshold) {
        try {
            return new TextDecoder('utf-16le').decode(buf);
        } catch {
            // ignore and fallback
        }
    }

    return buf.toString('utf8');
}

function workbookToDelimitedText(workbook: XLSX.WorkBook): string {
    let text = '';
    for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;
        text += `Sheet: ${sheetName}\n`;
        text += XLSX.utils.sheet_to_csv(worksheet, { FS: ',', blankrows: false });
        text += '\n\n';
    }
    return text.trim();
}

function tryExtractSpreadsheet(buffer: Buffer): string | null {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
        if (!workbook.SheetNames?.length) return null;
        const t = workbookToDelimitedText(workbook);
        return t.length > 0 ? t : null;
    } catch {
        return null;
    }
}

async function extractPdfWithUnpdf(buffer: Buffer): Promise<FileExtractionResult> {
    // Normal dynamic import so Next/Vercel can trace/bundle server dependency reliably.
    const { extractText, getMeta } = await import('unpdf');
    const data = new Uint8Array(buffer);
    const result = await extractText(data, { mergePages: true });
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

/** Used by structured chat context; same extraction path as PDF in `extractTextFromFile`. */
export async function extractPdfText(buffer: Buffer): Promise<{
    text: string;
    numpages: number;
    info: Record<string, unknown>;
}> {
    const r = await extractPdfWithUnpdf(buffer);
    return {
        text: r.text,
        numpages: r.metadata?.numPages ?? 0,
        info: r.metadata?.info ?? {},
    };
}

export async function extractTextFromFile(base64DataUri: string): Promise<FileExtractionResult> {
    const { mimeTypeRaw, mimeBase, buffer } = parseDataUriToBuffer(base64DataUri);

    try {
        if (mimeBase === 'application/pdf' || isPdfSignature(buffer)) {
            return await extractPdfWithUnpdf(buffer);
        }

        if (mimeBase === 'application/vnd.oasis.opendocument.spreadsheet') {
            const sheetText = tryExtractSpreadsheet(buffer);
            if (sheetText) {
                return { text: sheetText, type: 'ods' };
            }
            throw new Error('Could not read ODS spreadsheet.');
        }

        if (
            mimeBase === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            mimeBase === 'application/vnd.ms-excel' ||
            mimeBase === 'application/vnd.ms-excel.sheet.macroenabled.12'
        ) {
            const sheetText = tryExtractSpreadsheet(buffer);
            if (sheetText) {
                const type = mimeBase.includes('macroenabled') ? 'xlsm' : mimeBase.includes('openxml') ? 'xlsx' : 'xls';
                return { text: sheetText, type };
            }
            if (mimeBase === 'application/vnd.ms-excel' && bufferLooksLikeTextCsv(buffer)) {
                return { text: decodeTextBuffer(buffer), type: 'csv' };
            }
            throw new Error('Could not read spreadsheet file.');
        }

        if (
            mimeBase === 'text/csv' ||
            mimeBase === 'application/csv' ||
            mimeBase === 'text/tab-separated-values' ||
            mimeBase === 'text/plain' ||
            mimeBase === 'application/json' ||
            mimeBase === 'application/xml' ||
            mimeBase === 'text/xml' ||
            mimeBase === 'text/html'
        ) {
            const body = decodeTextBuffer(buffer);
            const type =
                mimeBase === 'application/json'
                    ? 'json'
                    : mimeBase === 'text/csv' || mimeBase === 'application/csv' || mimeBase === 'text/tab-separated-values'
                      ? 'csv'
                      : 'text';
            return { text: body, type };
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
                return { text: decodeTextBuffer(buffer), type: 'csv' };
            }
            const sheetText = tryExtractSpreadsheet(buffer);
            if (sheetText) {
                return { text: sheetText, type: 'spreadsheet' };
            }
            return { text: decodeTextBuffer(buffer), type: 'text' };
        }

        const fallbackSheet = tryExtractSpreadsheet(buffer);
        if (fallbackSheet) {
            return { text: fallbackSheet, type: 'spreadsheet' };
        }

        const asUtf8 = decodeTextBuffer(buffer);
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

export function cleanTextForPdfChat(text: string): string {
    return text
        .replace(/\r\n?/g, '\n')
        .replace(/\u00a0/g, ' ')
        .replace(/\n{5,}/g, '\n\n\n\n')
        .trim();
}
