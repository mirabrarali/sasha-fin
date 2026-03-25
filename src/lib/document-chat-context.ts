import * as XLSX from 'xlsx';
import { CONTEXT_LIMITS } from '@/lib/constants';
import {
    cleanText,
    cleanTextForPdfChat,
    extractPdfText,
    extractTextFromFile,
    isPdfSignature,
    parseDataUriToBuffer,
} from '@/lib/pdf-extractor';

function tryParseSpreadsheetWorkbook(buffer: Buffer, mimeBase: string): XLSX.WorkBook | null {
    const tryBuf = (): XLSX.WorkBook | null => {
        try {
            return XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
        } catch {
            return null;
        }
    };
    const tryStr = (): XLSX.WorkBook | null => {
        try {
            return XLSX.read(buffer.toString('utf-8'), { type: 'string', cellDates: true, raw: false });
        } catch {
            return null;
        }
    };

    if (mimeBase === 'text/csv' || mimeBase === 'application/csv' || mimeBase === 'text/plain') {
        return tryStr() ?? tryBuf();
    }
    const wb = tryBuf() ?? tryStr();
    if (!wb?.SheetNames?.length) return null;
    return wb;
}

function truncateCsvLines(csv: string, maxChars: number): string {
    if (csv.length <= maxChars) return csv;
    const lines = csv.split(/\r?\n/);
    if (lines.length <= 2) return csv.slice(0, maxChars) + '\n...[truncated]';
    const header = lines[0] ?? '';
    const dataLines = lines.slice(1).filter((l) => l.length > 0);
    const omittedNote = (n: number) => `\n...[${n} data row(s) omitted from middle; row count in GROUND TRUTH is still exact]...\n`;
    let headCount = Math.max(1, Math.floor(dataLines.length * 0.55));
    let tailCount = Math.max(0, Math.floor(dataLines.length * 0.2));
    for (let attempt = 0; attempt < 12; attempt++) {
        const head = dataLines.slice(0, headCount);
        const tail = tailCount > 0 ? dataLines.slice(-tailCount) : [];
        const omitted = Math.max(0, dataLines.length - headCount - tailCount);
        const body =
            tail.length && omitted > 0
                ? [...head, omittedNote(omitted), ...tail].join('\n')
                : dataLines.join('\n');
        const out = [header, body].join('\n');
        if (out.length <= maxChars) return out;
        headCount = Math.max(1, Math.floor(headCount * 0.75));
        tailCount = Math.floor(tailCount * 0.75);
    }
    return csv.slice(0, maxChars) + '\n...[truncated]';
}

function formatWorkbookForChat(wb: XLSX.WorkBook): string {
    const maxCsvPerSheet = CONTEXT_LIMITS.CHAT_TABULAR_CSV_PER_SHEET;
    const jsonFirst = CONTEXT_LIMITS.CHAT_TABULAR_JSON_FIRST;
    const jsonLast = CONTEXT_LIMITS.CHAT_TABULAR_JSON_LAST;

    const parts: string[] = [
        '## GROUND TRUTH (parsed with SheetJS — row/column counts below are exact)',
        '- Answer questions using this section. Do not estimate or contradict the stated row counts or column names.',
        `- Workbook sheets: ${wb.SheetNames.map((n) => JSON.stringify(n)).join(', ')}`,
    ];

    for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        if (!ws) continue;

        const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
            defval: '',
            raw: false,
        });
        const headers = records.length > 0 ? Object.keys(records[0]) : [];
        const dataRowCount = records.length;

        parts.push(`\n### Sheet: ${JSON.stringify(sheetName)}`);
        parts.push(`- Number of columns (from header row): ${headers.length}`);
        parts.push(`- Column names: ${headers.map((h) => JSON.stringify(String(h))).join(', ')}`);
        parts.push(
            `- Number of data rows (rows under the header; each object is one row): **${dataRowCount}**`
        );

        const csv = XLSX.utils.sheet_to_csv(ws, { FS: ',', blankrows: false });
        parts.push('\n#### Tabular data as CSV\n```csv');
        parts.push(truncateCsvLines(csv, maxCsvPerSheet));
        parts.push('```');

        const first = records.slice(0, jsonFirst);
        parts.push('\n#### First rows as JSON (for exact cell values)\n```json');
        parts.push(JSON.stringify(first, null, 2));
        parts.push('```');

        if (dataRowCount > jsonFirst + jsonLast) {
            const last = records.slice(-jsonLast);
            parts.push('\n#### Last rows as JSON\n```json');
            parts.push(JSON.stringify(last, null, 2));
            parts.push('```');
        }
    }

    let out = parts.join('\n');
    const cap = CONTEXT_LIMITS.CHAT_DOCUMENT_MAX;
    if (out.length > cap) {
        out =
            out.slice(0, cap) +
            `\n\n...[document context truncated at ${cap} characters; GROUND TRUTH row counts above remain valid]...`;
    }
    return out;
}

/**
 * Build chat context from an uploaded file data URI: structured spreadsheets (exact stats)
 * or PDF text with light normalization (no aggressive cleanText).
 */
export async function buildDocumentContextForChat(dataUri: string): Promise<string> {
    const { mimeBase, buffer } = parseDataUriToBuffer(dataUri);

    if (mimeBase === 'application/pdf' || isPdfSignature(buffer)) {
        const { text, numpages } = await extractPdfText(buffer);
        const normalized = cleanTextForPdfChat(text);
        const slice = normalized.slice(0, CONTEXT_LIMITS.CHAT_PDF);
        return [
            '## Document type: PDF',
            `## Pages extracted: ${numpages}`,
            '- Answer only from the text below. For counts, use what appears explicitly in the text.',
            '',
            slice,
        ].join('\n');
    }

    const wb = tryParseSpreadsheetWorkbook(buffer, mimeBase);
    if (wb) {
        return formatWorkbookForChat(wb);
    }

    const fallback = await extractTextFromFile(dataUri);
    const raw = fallback.text;
    const isTabular =
        fallback.type === 'csv' ||
        fallback.type === 'xlsx' ||
        fallback.type === 'xls' ||
        fallback.type === 'spreadsheet' ||
        fallback.type === 'ods';
    const preserveStructure =
        isTabular || fallback.type === 'json' || fallback.type === 'text';

    const body = preserveStructure ? raw.replace(/\r\n?/g, '\n').trim() : cleanText(raw);
    const cap = CONTEXT_LIMITS.CHAT_DOCUMENT_MAX;
    const slice = body.slice(0, cap);
    return [
        '## Extracted file text (fallback — prefer exact counts only if stated below)',
        slice,
    ].join('\n\n');
}
