'use server';

/**
 * @fileOverview Financial Statement Analysis using Genkit + Gemini
 * Uses PDF text extraction instead of vision models
 */

import { ai, defaultModel } from '@/ai/genkit';
import { extractTextFromFile, cleanText } from '@/lib/pdf-extractor';
import { z } from 'genkit';
import { CONTEXT_LIMITS, TIMEOUTS } from '@/lib/constants';
import {
  getFriendlyGeminiUnavailableMessage,
  isTransientGeminiError,
  withTransientGeminiRetries,
} from '@/lib/gemini-transient-retry';
import { withLLMTimeout, withFileOperationTimeout } from '@/lib/timeout-utils';

const PRIMARY_DOC_CHAR_BUDGET = CONTEXT_LIMITS.FINANCIAL_STATEMENT;
const FALLBACK_DOC_CHAR_BUDGET = Math.max(10_000, Math.floor(CONTEXT_LIMITS.FINANCIAL_STATEMENT * 0.55));
const FINANCIAL_TIMEOUT_MS = Math.min(TIMEOUTS.LLM_CHAT, 25_000);

/**
 * Large enough for structured JSON with a long `summary` plus all other keys.
 * Truncation mid-JSON still happens at 8k on verbose HTML summaries; 24k leaves headroom.
 */
const FINANCIAL_ANALYSIS_MAX_OUTPUT_TOKENS = 3_200;

const SUMMARY_MAX_CHARS = 2800;
const TRENDS_MAX_CHARS = 1200;
const PREDICTION_MAX_CHARS = 700;
const CREDIT_SCORE_MAX_CHARS = 700;
const FLAW_ITEM_MAX_CHARS = 220;
const INSIGHT_ITEM_MAX_CHARS = 160;

/** Shorter budgets so the model always finishes every required JSON key (used after failures). */
const COMPACT_OUTPUT_INSTRUCTIONS = `
STRICT per-field caps (character counts include HTML/Markdown inside strings):
- summary: at most ${SUMMARY_MAX_CHARS} characters; keep all four H2 sections but tight prose.
- trendsAndGraphs: at most ${TRENDS_MAX_CHARS} characters.
- prediction: at most ${PREDICTION_MAX_CHARS} characters.
- creditScorePrediction: at most ${CREDIT_SCORE_MAX_CHARS} characters.
- identifiedFlaws: 3–6 items, each at most ${FLAW_ITEM_MAX_CHARS} characters.
- criticalInsights: if present, 4–6 items, each at most ${INSIGHT_ITEM_MAX_CHARS} characters.
- keyMetrics: 0–5 rows; when the document has no fiscal periods, use a single row with name "Snapshot" and omit revenue/netIncome.
`;

const AnalyzeFinancialStatementInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      'Financial data as a data URI (Base64). Supported: PDF, Excel (.xlsx, .xls, .xlsm, .ods), CSV/TSV, journal (.jrn), plain text, JSON, XML, HTML.'
    ),
  language: z
    .enum(['en', 'ar'])
    .default('en')
    .describe('The language for the response, either English (en) or Arabic (ar).'),
});
export type AnalyzeFinancialStatementInput = z.infer<typeof AnalyzeFinancialStatementInputSchema>;

const KeyMetricRowSchema = z.object({
  name: z.string().describe("The financial year or period for the data point (e.g., '2023')."),
  revenue: z.number().nullish().describe('Total revenue for the period, if known.'),
  netIncome: z.number().nullish().describe('Net income for the period, if known.'),
});

const AnalyzeFinancialStatementOutputSchema = z.object({
  summary: z
    .string()
    .max(SUMMARY_MAX_CHARS + 400)
    .describe(
      `Institutional summary of financial health (Markdown H2 sections as instructed). Prefer staying under ${SUMMARY_MAX_CHARS} characters so every JSON field can complete.`
    ),
  trendsAndGraphs: z
    .string()
    .max(TRENDS_MAX_CHARS + 300)
    .describe(
      'Narrative on trends and chart suggestions (no chart JSON). Prefer staying under budget so other keys are not truncated.'
    ),
  prediction: z
    .string()
    .max(PREDICTION_MAX_CHARS + 200)
    .describe(
      'Evidence-backed outlook (e.g., "Strong Growth Potential," "Stable but Cautious," "High-Risk").'
    ),
  creditScorePrediction: z
    .string()
    .max(CREDIT_SCORE_MAX_CHARS + 200)
    .describe(
      'Predicted credit score or tight range (e.g., 680-720) with brief justification (Oman / Middle East context).'
    ),
  identifiedFlaws: z
    .array(z.string().max(FLAW_ITEM_MAX_CHARS + 120))
    .describe(
      'Critical risks / flaws. Each item MUST follow exactly: "Severity — Topic: explanation". Severity is exactly one of High | Medium | Low.'
    ),
  criticalInsights: z
    .array(z.string().max(INSIGHT_ITEM_MAX_CHARS + 80))
    .max(8)
    .optional()
    .describe('4–8 crisp, non-redundant insight bullets for leadership; each string standalone.'),
  keyMetrics: z
    .array(KeyMetricRowSchema)
    .describe(
      'Up to 5 periods with name plus revenue/netIncome when inferable from the document. Omit revenue/netIncome keys when unknown — do not use null.'
    ),
});

type ParsedFinancialAnalysis = z.infer<typeof AnalyzeFinancialStatementOutputSchema>;
export type AnalyzeFinancialStatementOutput = Omit<ParsedFinancialAnalysis, 'keyMetrics' | 'criticalInsights'> & {
  keyMetrics: Array<{ name: string; revenue?: number; netIncome?: number }>;
  criticalInsights: string[];
};

function stripNullishMetrics(data: z.infer<typeof AnalyzeFinancialStatementOutputSchema>): AnalyzeFinancialStatementOutput {
  return {
    ...data,
    criticalInsights: (data.criticalInsights ?? []).filter((s) => typeof s === 'string' && s.trim().length > 0),
    keyMetrics: data.keyMetrics.map((m) => {
      const row: { name: string; revenue?: number; netIncome?: number } = { name: m.name };
      if (typeof m.revenue === 'number' && !Number.isNaN(m.revenue)) row.revenue = m.revenue;
      if (typeof m.netIncome === 'number' && !Number.isNaN(m.netIncome)) row.netIncome = m.netIncome;
      return row;
    }),
  };
}

function resolveFinancialAnalysisOutput(rawText: string): AnalyzeFinancialStatementOutput {
  const text = rawText.trim();
  if (!text) throw new Error('Empty model response');

  const trySafeParse = (candidate: string): AnalyzeFinancialStatementOutput | null => {
    const trimmed = candidate.trim();
    try {
      const data = JSON.parse(trimmed) as unknown;
      const checked = AnalyzeFinancialStatementOutputSchema.safeParse(data);
      if (checked.success) return stripNullishMetrics(checked.data);
    } catch {
      // not JSON
    }
    return null;
  };

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    const fromFence = trySafeParse(fence[1]);
    if (fromFence) return fromFence;
  }
  const direct = trySafeParse(text);
  if (direct) return direct;
  throw new Error('Could not parse financial analysis from the model (invalid or incomplete JSON).');
}

const SYSTEM_PROMPT = `You are an elite AI financial entity embodying the combined expertise of a Big Four auditor, a chartered accountant (CA), and a senior investment analyst. You have deep expertise in Middle Eastern financial markets, particularly Omani credit bureau standards.

Your goal is to be surgically precise, focusing exclusively on the financial data to produce an institutional-quality report.

1. Forensic Data Extraction:
- Scan the document to locate primary financial statements (Income Statement, Balance Sheet, Cash Flow Statement).
- Disregard non-essential narrative text.

2. Comprehensive Metric & Ratio Analysis:
- Analyze KPIs, balance sheet posture, cash flows, profitability, liquidity, leverage, and trend direction.

3. Generate report fields (respect caps so JSON is never cut off):
- summary: Requested language. Markdown H2 headings in this exact order:
  1) Executive overview
  2) Key quantitative signals
  3) Risks worth monitoring
  4) Bottom line
  Aim under ${SUMMARY_MAX_CHARS} characters total for this string.
- trendsAndGraphs: Under ~${TRENDS_MAX_CHARS} characters; trends + which charts would help (no chart JSON).
- prediction: Under ~${PREDICTION_MAX_CHARS} characters; cite at least one concrete signal.
- creditScorePrediction: Under ~${CREDIT_SCORE_MAX_CHARS} characters; score or tight range + brief justification.
- identifiedFlaws: 3–6 items; each under ~${FLAW_ITEM_MAX_CHARS} chars; format "Severity — Topic: explanation" (Severity: High | Medium | Low).
- criticalInsights: 4–8 bullets if included; each concise; do not repeat identifiedFlaws verbatim.
- keyMetrics: Up to 5 objects with name + revenue/netIncome when inferable. If no fiscal periods exist, use one row { "name": "Snapshot" } and omit revenue/netIncome. Omit unknown numeric keys, never null.

CRITICAL: Emit one complete JSON object with every required key (summary, trendsAndGraphs, prediction, creditScorePrediction, identifiedFlaws, keyMetrics). Write shorter sections if needed—never output only summary or truncate mid-string.
`;

function buildCompactDocumentText(raw: string, type: string, maxChars: number): string {
  const text = raw.trim();
  if (text.length <= maxChars) return text;

  const isTabular =
    type === 'csv' ||
    type === 'xlsx' ||
    type === 'xls' ||
    type === 'xlsm' ||
    type === 'ods' ||
    type === 'spreadsheet' ||
    type === 'jrn';
  if (!isTabular) return text.slice(0, maxChars);

  const lines = text.split('\n');
  if (lines.length <= 2) return text.slice(0, maxChars);
  const header = lines[0] ?? '';
  const dataLines = lines.slice(1).filter((line) => line.trim().length > 0);
  const budget = Math.max(2_000, maxChars - header.length - 200);
  const firstTarget = Math.floor(budget * 0.72);
  const lastTarget = Math.floor(budget * 0.2);

  const takeFromStart: string[] = [];
  let used = 0;
  for (const line of dataLines) {
    if (used + line.length + 1 > firstTarget) break;
    takeFromStart.push(line);
    used += line.length + 1;
  }
  const takeFromEnd: string[] = [];
  used = 0;
  for (let i = dataLines.length - 1; i >= takeFromStart.length; i--) {
    const line = dataLines[i]!;
    if (used + line.length + 1 > lastTarget) break;
    takeFromEnd.unshift(line);
    used += line.length + 1;
  }
  const omittedRows = Math.max(0, dataLines.length - takeFromStart.length - takeFromEnd.length);
  const middleNote =
    omittedRows > 0 ? `...[${omittedRows} tabular row(s) omitted to stay under model context budget]...` : '';

  return [header, ...takeFromStart, middleNote, ...takeFromEnd].filter(Boolean).join('\n').slice(0, maxChars);
}

function isRequestTooLargeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('Request too large') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('quota') ||
    message.includes('429') ||
    message.includes('token')
  );
}

function isStructuredOutputSchemaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.includes('Schema validation failed') || message.includes('must have required property');
}

async function runAnalyzeFinancialStatement(
  input: AnalyzeFinancialStatementInput
): Promise<AnalyzeFinancialStatementOutput> {
  try {
    console.log('Extracting text from uploaded document...');
    const { text, type, metadata } = await withFileOperationTimeout(
      extractTextFromFile(input.pdfDataUri),
      TIMEOUTS.PDF_EXTRACTION
    );
    const cleanedText =
      type === 'pdf' ? cleanText(text) : text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').trim();
    const numPages = metadata?.numPages ?? 0;

    console.log(
      `Extracted ${cleanedText.length} characters from ${type} file${numPages ? ` (${numPages} pages)` : ''}`
    );

    const minChars = type === 'pdf' ? 100 : 20;
    if (!cleanedText || cleanedText.length < minChars) {
      throw new Error(
        'Insufficient text extracted from the file. For PDFs, ensure the document has selectable text. For spreadsheets, CSV, or text exports, ensure the file is not empty.'
      );
    }

    const docCandidates = [PRIMARY_DOC_CHAR_BUDGET, FALLBACK_DOC_CHAR_BUDGET];
    let lastAttemptError: unknown;
    let result: AnalyzeFinancialStatementOutput | null = null;

    for (let i = 0; i < docCandidates.length; i++) {
      const docBudget = docCandidates[i]!;
      const documentText = buildCompactDocumentText(cleanedText, type, docBudget);
      const prompt = `${SYSTEM_PROMPT}\n\nLanguage: ${
        input.language === 'ar' ? 'Arabic' : 'English'
      }\n\nFinancial Statement Text:\n${documentText}`;
      console.log(
        `Analyzing financial statement with Gemini... attempt ${i + 1}/${docCandidates.length} (doc chars=${documentText.length})`
      );

      try {
        const response = await withTransientGeminiRetries(
          'financial-statement structured',
          () =>
            withLLMTimeout(
              ai.generate({
                model: defaultModel({ temperature: 0.2, maxOutputTokens: FINANCIAL_ANALYSIS_MAX_OUTPUT_TOKENS }),
                prompt,
                output: { schema: AnalyzeFinancialStatementOutputSchema },
              }),
              FINANCIAL_TIMEOUT_MS
            ),
          { maxAttempts: 1, maxSleepMs: 1_000 }
        );
        if (response.output) {
          result = stripNullishMetrics(response.output);
        } else {
          result = resolveFinancialAnalysisOutput(response.text ?? '');
        }
        break;
      } catch (error) {
        lastAttemptError = error;
        if (i < docCandidates.length - 1 && isRequestTooLargeError(error)) {
          console.warn('LLM request exceeded context limits; retrying with smaller compact context...');
          continue;
        }
        if (isStructuredOutputSchemaError(error)) {
          console.warn('Structured output failed; retrying with JSON-as-text (standard then compact budgets)...');
          const textPromptVariants = [
            `${prompt}\n\nReturn ONLY valid JSON matching the schema (no markdown fences, no commentary).`,
            `${prompt}\n${COMPACT_OUTPUT_INSTRUCTIONS}\n\nReturn ONLY valid JSON matching the schema (no markdown fences, no commentary).`,
          ];
          let lastFallbackError: unknown = error;
          for (const textPrompt of textPromptVariants) {
            try {
              const textRetry = await withTransientGeminiRetries(
                'financial-statement json-as-text',
                () =>
                  withLLMTimeout(
                    ai.generate({
                      model: defaultModel({ temperature: 0.15, maxOutputTokens: FINANCIAL_ANALYSIS_MAX_OUTPUT_TOKENS }),
                      prompt: textPrompt,
                    }),
                    Math.min(FINANCIAL_TIMEOUT_MS, 12_000)
                  ),
                { maxAttempts: 1, maxSleepMs: 1_500 }
              );
              result = resolveFinancialAnalysisOutput(textRetry.text ?? '');
              break;
            } catch (fallbackErr) {
              lastFallbackError = fallbackErr;
              console.warn(
                'JSON-as-text attempt failed:',
                fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
              );
            }
          }
          if (result) {
            break;
          }
          throw lastFallbackError instanceof Error ? lastFallbackError : new Error(String(lastFallbackError));
        }
        throw error;
      }
    }

    if (!result) {
      throw (lastAttemptError instanceof Error
        ? lastAttemptError
        : new Error('LLM analysis failed with unknown error'));
    }

    console.log('Financial analysis completed successfully');
    return result;
  } catch (error) {
    console.error('Financial statement analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('timed out')) {
      throw new Error(
        'Analysis timed out. The document may be too large or complex. Please try a smaller file or try again.'
      );
    }
    if (isRequestTooLargeError(error)) {
      throw new Error(
        'The uploaded file is too large for one AI request. A compact sample was sent automatically, but limits were still exceeded. Try a smaller extract or fewer columns.'
      );
    }
    if (isTransientGeminiError(error)) {
      throw new Error(getFriendlyGeminiUnavailableMessage(error));
    }
    throw new Error(`Failed to analyze financial statement: ${errorMessage}`);
  }
}

export const analyzeFinancialStatementFlow = ai.defineFlow(
  {
    name: 'analyzeFinancialStatementFlow',
    inputSchema: AnalyzeFinancialStatementInputSchema,
    outputSchema: AnalyzeFinancialStatementOutputSchema,
  },
  async (input) => {
    const result = await runAnalyzeFinancialStatement(input);
    return result;
  }
);

export async function analyzeFinancialStatement(
  input: AnalyzeFinancialStatementInput
): Promise<AnalyzeFinancialStatementOutput> {
  const raw = await analyzeFinancialStatementFlow(input);
  return stripNullishMetrics(raw);
}
