/**
 * Chat page uploads: PDF, spreadsheets, journals (JRN), and common text/data formats.
 */

import { FILE_SIZE_LIMITS } from '@/lib/constants';

/** Lowercase extensions including leading dot */
const CHAT_UPLOAD_EXTENSIONS = new Set([
    '.pdf',
    '.csv',
    '.tsv',
    '.xlsx',
    '.xls',
    '.xlsm',
    '.ods',
    '.jrn',
    '.txt',
    '.text',
    '.log',
    '.json',
    '.xml',
    '.yaml',
    '.yml',
    '.html',
    '.htm',
    '.rtf',
    '.prn',
    '.dat',
    '.psv',
    '.tab',
    '.iif',
    '.qif',
    '.gl',
    '.mt940',
    '.sta',
    '.cob',
    '.swift',
]);

const MIME_ALLOWLIST = new Set([
    'application/pdf',
    'text/csv',
    'application/csv',
    'text/tab-separated-values',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroenabled.12',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/json',
    'application/xml',
    'text/xml',
    'text/html',
    'text/plain',
]);

function fileExtensionLower(name: string): string {
    const n = name.toLowerCase().trim();
    const i = n.lastIndexOf('.');
    if (i <= 0 || i === n.length - 1) return '';
    return n.slice(i);
}

export function isChatFinancialUpload(file: File): boolean {
    const ext = fileExtensionLower(file.name);
    if (ext && CHAT_UPLOAD_EXTENSIONS.has(ext)) return true;

    const raw = (file.type || '').trim();
    const base = raw.split(';')[0].trim().toLowerCase();
    if (base && MIME_ALLOWLIST.has(base)) return true;
    if (base.startsWith('text/')) return true;

    if (base === 'application/octet-stream' && ext && CHAT_UPLOAD_EXTENSIONS.has(ext)) {
        return true;
    }

    return false;
}

/** Drag-over hint: allow empty type (validate on drop) or known MIME / any text subtype. */
export function isLikelySupportedDragMime(mime: string): boolean {
    if (!mime) return true;
    const base = mime.split(';')[0].trim().toLowerCase();
    if (MIME_ALLOWLIST.has(base)) return true;
    if (base.startsWith('text/')) return true;
    return false;
}

export function getMaxSizeForChatUpload(file: File): number {
    const n = file.name.toLowerCase();
    if (n.endsWith('.pdf')) return FILE_SIZE_LIMITS.PDF;
    if (/\.(xlsx|xls|xlsm|ods)$/.test(n)) return FILE_SIZE_LIMITS.XLSX;
    if (/\.(csv|tsv|txt|jrn|json|xml|yaml|yml|html|htm|rtf|prn|dat|psv|tab|log|iif|qif|gl|mt940|sta|cob|swift)$/.test(n)) {
        return FILE_SIZE_LIMITS.CSV;
    }
    return FILE_SIZE_LIMITS.DEFAULT;
}

/** MIME types for drag-over styling (subset; unknown text/* still allowed via isLikelySupportedDragMime). */
export const CHAT_UPLOAD_DRAG_MIMES = new Set([
    'application/pdf',
    'text/csv',
    'application/csv',
    'text/tab-separated-values',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroenabled.12',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/json',
    'application/xml',
    'text/xml',
    'text/html',
    'text/plain',
]);

/** HTML file input `accept` list (extensions + a few MIME hints). */
export const CHAT_FILE_INPUT_ACCEPT = [
    '.pdf',
    '.csv',
    '.tsv',
    '.xlsx',
    '.xls',
    '.xlsm',
    '.ods',
    '.jrn',
    '.txt',
    '.log',
    '.json',
    '.xml',
    '.yaml',
    '.yml',
    '.html',
    '.htm',
    '.rtf',
    '.prn',
    '.dat',
    '.psv',
    '.tab',
    '.iif',
    '.qif',
    '.gl',
    '.mt940',
    '.sta',
    '.cob',
    '.swift',
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/json',
    'text/plain',
].join(',');
