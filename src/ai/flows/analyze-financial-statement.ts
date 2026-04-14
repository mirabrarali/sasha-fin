'use server';

/**
 * @fileOverview Financial Statement Analysis using LangChain + Groq
 * Migrated from Genkit to LangChain for better performance
 * Uses PDF text extraction instead of vision models
 */

import { getLLM } from '@/ai/langchain';
import { extractTextFromFile, cleanText } from '@/lib/pdf-extractor';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { CONTEXT_LIMITS, TIMEOUTS } from '@/lib/constants';
import { withLLMTimeout, withFileOperationTimeout } from '@/lib/timeout-utils';
import { structuredParserFromZod, toLlmText } from '@/lib/langchain-output-utils';

const GROQ_TPM_LIMIT = 12_000;
const GROQ_OUTPUT_TOKEN_BUDGET = 1_600;
const SAFETY_PROMPT_TOKENS = 1_700;
const CHARS_PER_TOKEN_ESTIMATE = 3.5;

const AnalyzeFinancialStatementInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      'Financial data as a data URI (Base64). Supported: PDF, Excel (.xlsx, .xls, .xlsm, .ods), CSV/TSV, plain text and journals (.jrn), JSON, XML, HTML.'
    ),
  language: z
    .enum(['en', 'ar'])
    .default('en')
    .describe('The language for the response, either English (en) or Arabic (ar).'),
});
export type AnalyzeFinancialStatementInput = z.infer<typeof AnalyzeFinancialStatementInputSchema>;

const KeyMetricRowSchema = z.object({
  name: z.string().describe("The financial year or period for the data point (e.g., '2023')."),
  /** Groq often emits `null`; Zod `.optional()` alone rejects null. */
  revenue: z.number().nullish().describe('Total revenue for the period, if known.'),
  netIncome: z.number().nullish().describe('Net income for the period, if known.'),
});

const AnalyzeFinancialStatementOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      "An expansive, multi-paragraph summary of the entity's financial health, weaving in KPIs and ratios to support the analysis."
    ),
  trendsAndGraphs: z
    .string()
    .describe(
      'A description of key financial trends and what relevant graphs (like revenue over time, profit margins) would visually represent. This should be a narrative description.'
    ),
  prediction: z
    .string()
    .describe(
      'A clear, evidence-backed prediction of the company\'s financial trajectory (e.g., "Strong Growth Potential," "Stable but Cautious," "High-Risk").'
    ),
  creditScorePrediction: z
    .string()
    .describe(
      'A predicted credit score (as a specific number or a tight range, e.g., 680-720) and a brief justification, framed within the context of Omani and general Middle Eastern credit bureau standards.'
    ),
  identifiedFlaws: z
    .array(z.string())
    .describe(
      'Critical risks / flaws. Each item MUST follow exactly: **Severity — Topic:** one or two sentences. Severity is exactly one of: High | Medium | Low (English words even if the rest of the report is Arabic). Example: "High — Liquidity: ..."'
    ),
  /** Short executive bullets (liquidity, leverage, concentration, earnings quality, etc.). */
  criticalInsights: z
    .array(z.string())
    .max(8)
    .optional()
    .describe('4–8 crisp, non-redundant insight bullets for leadership; each string standalone (no JSON nesting).'),
  keyMetrics: z
    .array(KeyMetricRowSchema)
    .describe(
      "Up to 5 periods with name plus revenue/netIncome when inferable from the document. For non-financial CSVs (e.g. customer lists), use best-effort or empty metrics. Omit revenue/netIncome keys when unknown — do not use null."
    ),
});

/** Public shape for UI: metrics never use `null` (only numbers or omitted). */
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
      if (typeof m.revenue === 'number' && !Number.isNaN(m.revenue)) {
        row.revenue = m.revenue;
      }
      if (typeof m.netIncome === 'number' && !Number.isNaN(m.netIncome)) {
        row.netIncome = m.netIncome;
      }
      return row;
    }),
  };
}

/**
 * Groq often wraps JSON in ``` fences and uses null for missing numbers; LangChain strict Zod parse fails on null + fences.
 */
async function resolveFinancialAnalysisOutput(
  raw: unknown,
  parser: ReturnType<typeof structuredParserFromZod>
): Promise<AnalyzeFinancialStatementOutput> {
  const text = toLlmText(raw).trim();
  if (!text) {
    throw new Error('Empty model response');
  }

  const trySafeParse = (candidate: string): AnalyzeFinancialStatementOutput | null => {
    const trimmed = candidate.trim();
    try {
      const data = JSON.parse(trimmed) as unknown;
      const checked = AnalyzeFinancialStatementOutputSchema.safeParse(data);
      if (checked.success) {
        return stripNullishMetrics(checked.data);
      }
    } catch {
      // not JSON
    }
    return null;
  };

  try {
    const parsed = await parser.parse(text);
    const checked = AnalyzeFinancialStatementOutputSchema.safeParse(parsed);
    if (checked.success) {
      return stripNullishMetrics(checked.data);
    }
  } catch {
    // fall through
  }

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    const fromFence = trySafeParse(fence[1]);
    if (fromFence) return fromFence;
  }

  const direct = trySafeParse(text);
  if (direct) return direct;

  throw new Error('Could not parse financial analysis from the model (invalid or incomplete JSON).');
}

const SYSTEM_PROMPT = `You are an elite AI financial entity embodying the combined expertise of a Big Four auditor, a chartered accountant (CA), and a senior investment analyst. You have deep expertise in Middle Eastern financial markets, particularly **Omani credit bureau standards**. Your task is to perform a forensic, critical, and insightful analysis of a company's or individual's financial statement.

Your goal is to be surgically precise, focusing exclusively on the financial data to produce an institutional-quality report.

1.  **Forensic Data Extraction:** Scan the document to locate primary financial statements (Income Statement, Balance Sheet, Cash Flow Statement). Disregard all non-essential narrative. Your extraction must be meticulous, as if preparing for an audit.

2.  **Comprehensive Metric & Ratio Analysis:** From the core statements, extract and analyze with the critical eye of an auditor looking for inconsistencies and a senior analyst assessing risk:
    *   **Key Performance Indicators (KPIs):** Revenue, Cost of Goods Sold (COGS), Gross Profit, Operating Expenses, Operating Income (EBIT), Net Income.
    *   **Balance Sheet Items:** Total Assets, Total Liabilities, Shareholders' Equity. Scrutinize the composition of assets and liabilities for any unusual items.
    *   **Cash Flow:** Cash Flow from Operations (CFO), Cash Flow from Investing (CFI), Cash Flow from Financing (CFF).
    *   **Key Financial Ratios:**
        *   **Profitability:** Gross Profit Margin, Net Profit Margin, Return on Equity (ROE).
        *   **Liquidity:** Current Ratio, Quick Ratio.
        *   **Leverage:** Debt-to-Equity Ratio, Debt-to-Asset Ratio.
    *   **Trend Analysis:** Identify significant year-over-year (YoY) changes and question their drivers.

3.  **Generate In-Depth Report:** Synthesize your findings into a detailed report with these sections:
    *   **summary:** Write in the requested **Language** (English or Arabic). Structure the summary with Markdown H2 headings on their own lines: start each line with two hash characters and a space, in this exact order: (1) Executive overview — 1–2 tight paragraphs; (2) Key quantitative signals — bullets or short paragraphs citing numbers from the document; (3) Risks worth monitoring — even if qualitative; (4) Bottom line — one closing paragraph. Use professional banking tone.
    *   **trendsAndGraphs:** Narrative on trends and what charts would show (no chart JSON here).
    *   **prediction:** Evidence-backed outlook with explicit reference to at least one concrete signal from the document.
    *   **creditScorePrediction:** Score or tight range plus justification (Omani / regional credit-bureau framing when relevant).
    *   **identifiedFlaws:** Each array entry MUST follow **Severity — Topic:** explanation (see schema). No bare sentences without severity and topic.
    *   **criticalInsights:** 4–8 separate executive bullets (liquidity, leverage, concentration, earnings quality, funding stability, data gaps, etc.). No duplication of identifiedFlaws wording.
    *   **keyMetrics:** Up to 5 objects with **name** (period label). Include **revenue** and **netIncome** only as numbers when inferable — **omit keys when unknown, never null**. For non-P&L uploads, return 0–3 best-effort rows so charts can still render (e.g. aggregate balances by inferred period).

{format_instructions}`;

function estimateTokensFromChars(chars: number): number {
  return Math.ceil(chars / CHARS_PER_TOKEN_ESTIMATE);
}

function buildCompactDocumentText(raw: string, type: string, maxChars: number): string {
  const text = raw.trim();
  if (text.length <= maxChars) return text;

  const isTabular =
    type === 'csv' ||
    type === 'xlsx' ||
    type === 'xls' ||
    type === 'xlsm' ||
    type === 'ods' ||
    type === 'spreadsheet';

  if (!isTabular) {
    return text.slice(0, maxChars);
  }

  const lines = text.split('\n');
  if (lines.length <= 2) {
    return text.slice(0, maxChars);
  }

  const header = lines[0] ?? '';
  const dataLines = lines.slice(1).filter((line) => line.trim().length > 0);
  const budget = Math.max(2_000, maxChars - header.length - 200);
  const firstTarget = Math.floor(budget * 0.72);
  const lastTarget = Math.floor(budget * 0.20);

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
    omittedRows > 0
      ? `...[${omittedRows} tabular row(s) omitted to stay under model token budget]...`
      : '';

  return [header, ...takeFromStart, middleNote, ...takeFromEnd]
    .filter(Boolean)
    .join('\n')
    .slice(0, maxChars);
}

function isRequestTooLargeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('Request too large') ||
    message.includes('rate_limit_exceeded') ||
    message.includes('tokens per minute') ||
    message.includes('"code":"rate_limit_exceeded"')
  );
}

export async function analyzeFinancialStatement(
  input: AnalyzeFinancialStatementInput
): Promise<AnalyzeFinancialStatementOutput> {
  try {
    console.log('Extracting text from uploaded document...');
    const { text, type, metadata } = await withFileOperationTimeout(
      extractTextFromFile(input.pdfDataUri),
      TIMEOUTS.PDF_EXTRACTION
    );
    const cleanedText =
      type === 'pdf'
        ? cleanText(text)
        : text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').trim();
    const numPages = metadata?.numPages ?? 0;

    console.log(`Extracted ${cleanedText.length} characters from ${type} file${numPages ? ` (${numPages} pages)` : ''}`);

    const minChars = type === 'pdf' ? 100 : 20;
    if (!cleanedText || cleanedText.length < minChars) {
      throw new Error(
        'Insufficient text extracted from the file. For PDFs, ensure the document has selectable text. For spreadsheets, journals (.jrn), CSV, or text exports, ensure the file is not empty.'
      );
    }

    const parser = structuredParserFromZod(AnalyzeFinancialStatementOutputSchema as any);
    const formatInstructions = parser.getFormatInstructions();

    const promptTemplate = new PromptTemplate({
      template: SYSTEM_PROMPT + '\n\nLanguage: {language}\n\nFinancial Statement Text:\n{documentText}',
      inputVariables: ['language', 'documentText'],
      partialVariables: { format_instructions: formatInstructions },
    });

    const staticPromptPart = SYSTEM_PROMPT.replace('{format_instructions}', formatInstructions);
    const staticPromptTokens = estimateTokensFromChars(staticPromptPart.length);
    const availableInputTokens = Math.max(
      1_500,
      GROQ_TPM_LIMIT - GROQ_OUTPUT_TOKEN_BUDGET - SAFETY_PROMPT_TOKENS - staticPromptTokens
    );
    const primaryDocCharBudget = Math.max(
      8_000,
      Math.min(
        CONTEXT_LIMITS.FINANCIAL_STATEMENT,
        Math.floor(availableInputTokens * CHARS_PER_TOKEN_ESTIMATE)
      )
    );
    const fallbackDocCharBudget = Math.max(4_000, Math.floor(primaryDocCharBudget * 0.55));
    const docCandidates = [primaryDocCharBudget, fallbackDocCharBudget];

    let lastAttemptError: unknown;
    let result: AnalyzeFinancialStatementOutput | null = null;
    for (let i = 0; i < docCandidates.length; i++) {
      const docBudget = docCandidates[i]!;
      const documentText = buildCompactDocumentText(cleanedText, type, docBudget);
      const prompt = await promptTemplate.format({
        language: input.language === 'ar' ? 'Arabic' : 'English',
        documentText,
      });

      const estimatedPromptTokens = estimateTokensFromChars(prompt.length);
      console.log(
        `Analyzing financial statement with LLM... attempt ${i + 1}/${docCandidates.length} (doc chars=${documentText.length}, est prompt tokens=${estimatedPromptTokens})`
      );

      try {
        const llm = getLLM();
        const response = await withLLMTimeout(llm.invoke(prompt), TIMEOUTS.LLM_CHAT);
        result = await resolveFinancialAnalysisOutput(response.content, parser);
        break;
      } catch (error) {
        lastAttemptError = error;
        if (i < docCandidates.length - 1 && isRequestTooLargeError(error)) {
          console.warn('LLM request exceeded token budget; retrying with smaller compact context...');
          continue;
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
        'The uploaded file is too large for a single AI request on the current Groq plan. We now send a compact sample automatically, but this file still exceeded limits. Try a smaller extract or fewer columns.'
      );
    }

    throw new Error(`Failed to analyze financial statement: ${errorMessage}`);
  }
}
