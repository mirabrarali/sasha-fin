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
  identifiedFlaws: z.array(z.string()).describe('A list of critical financial flaws, risks, or red flags identified in the statements. Each string is a separate point.'),
  keyMetrics: z
    .array(KeyMetricRowSchema)
    .describe(
      "Up to 5 periods with name plus revenue/netIncome when inferable from the document. For non-financial CSVs (e.g. customer lists), use best-effort or empty metrics. Omit revenue/netIncome keys when unknown — do not use null."
    ),
});

/** Public shape for UI: metrics never use `null` (only numbers or omitted). */
type ParsedFinancialAnalysis = z.infer<typeof AnalyzeFinancialStatementOutputSchema>;
export type AnalyzeFinancialStatementOutput = Omit<ParsedFinancialAnalysis, 'keyMetrics'> & {
  keyMetrics: Array<{ name: string; revenue?: number; netIncome?: number }>;
};

function stripNullishMetrics(data: z.infer<typeof AnalyzeFinancialStatementOutputSchema>): AnalyzeFinancialStatementOutput {
  return {
    ...data,
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

3.  **Generate In-Depth Report:** Synthesize your findings into a detailed report with six sections:
    *   **summary:** Provide an expansive, multi-paragraph summary of the entity's financial health. Weave in the KPIs and ratios to support your analysis of strengths and weaknesses.
    *   **trendsAndGraphs:** Provide a narrative description of the key financial trends (e.g., YoY revenue growth, margin changes). For each trend, describe a graph that would visually represent it.
    *   **prediction:** Offer a clear, evidence-backed prediction of the company's future financial trajectory. Justify this by citing specific ratios, trends, and cash flow dynamics.
    *   **creditScorePrediction:** Based on your analysis, provide a predicted credit score (as a specific number or a tight range, e.g., 680-720), framed within **Omani and general Middle Eastern credit bureau standards**. Justify the score.
    *   **identifiedFlaws:** List any critical financial flaws, risks, or red flags as a list of distinct points.
    *   **keyMetrics:** Array of up to 5 objects with **name** (period label). Include **revenue** and **netIncome** only as numbers when you can infer them from the document. If the upload is not a traditional P&L (e.g. customer/account CSV), you may return fewer rows or omit revenue/netIncome keys entirely — **never use JSON null for revenue or netIncome** (omit the property instead).

{format_instructions}`;

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

    const prompt = await promptTemplate.format({
      language: input.language === 'ar' ? 'Arabic' : 'English',
      documentText: cleanedText.slice(0, CONTEXT_LIMITS.FINANCIAL_STATEMENT),
    });

    console.log('Analyzing financial statement with LLM...');
    const llm = getLLM();
    const response = await withLLMTimeout(llm.invoke(prompt), TIMEOUTS.LLM_CHAT);

    const result = await resolveFinancialAnalysisOutput(response.content, parser);

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

    throw new Error(`Failed to analyze financial statement: ${errorMessage}`);
  }
}
