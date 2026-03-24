/**
 * Validates financial documents uploaded from the chat page (PDF, CSV, Excel).
 */

import { FILE_SIZE_LIMITS } from '@/lib/constants';

const EXTENSIONS = ['.pdf', '.csv', '.xlsx', '.xls'] as const;

const MIME_ALLOWLIST = new Set([
  'application/pdf',
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export function isChatFinancialUpload(file: File): boolean {
  const name = file.name.toLowerCase();
  const hasAllowedExt = EXTENSIONS.some((ext) => name.endsWith(ext));
  if (hasAllowedExt) return true;
  if (file.type && MIME_ALLOWLIST.has(file.type)) return true;
  return false;
}

export function getMaxSizeForChatUpload(file: File): number {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return FILE_SIZE_LIMITS.PDF;
  return FILE_SIZE_LIMITS.CSV;
}

/** MIME types we treat as valid during drag-over (CSV often has empty type). */
export const CHAT_UPLOAD_DRAG_MIMES = new Set([
  'application/pdf',
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
