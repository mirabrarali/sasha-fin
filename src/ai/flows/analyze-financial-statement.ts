'use server';

/**
 * @fileOverview Financial Statement Analysis using LangChain + Groq
 * Migrated from Genkit to LangChain for better performance
 * Uses PDF text extraction instead of vision models
 */

import { getLLM } from '@/ai/langchain';
import { extractTextFromPDF, cleanPDFText } from '@/lib/pdf-extractor';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { CONTEXT_LIMITS, TIMEOUTS } from '@/lib/constants';
import { withLLMTimeout, withFileOperationTimeout } from '@/lib/timeout-utils';

const AnalyzeFinancialStatementInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A company's financial statement in PDF format, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
  language: z.enum(['en', 'ar']).default('en').describe('The language for the response, either English (en) or Arabic (ar).'),
});
export type AnalyzeFinancialStatementInput = z.infer<typeof AnalyzeFinancialStatementInputSchema>;

const AnalyzeFinancialStatementOutputSchema = z.object({
  summary: z.string().describe("An expansive, multi-paragraph summary of the entity's financial health, weaving in KPIs and ratios to support the analysis."),
  trendsAndGraphs: z.string().describe("A description of key financial trends and what relevant graphs (like revenue over time, profit margins) would visually represent. This should be a narrative description."),
  prediction: z.string().describe('A clear, evidence-backed prediction of the company\'s financial trajectory (e.g., "Strong Growth Potential," "Stable but Cautious," "High-Risk").'),
  creditScorePrediction: z.string().describe('A predicted credit score (as a specific number or a tight range, e.g., 680-720) and a brief justification, framed within the context of Omani and general Middle Eastern credit bureau standards.'),
  identifiedFlaws: z.array(z.string()).describe("A list of critical financial flaws, risks, or red flags identified in the statements. Each string is a separate point."),
  keyMetrics: z.array(z.object({
    name: z.string().describe("The financial year or period for the data point (e.g., '2023')."),
    revenue: z.number().optional().describe("Total revenue for the period."),
    netIncome: z.number().optional().describe("Net income for the period."),
  })).describe("An array of key financial metrics over several periods (e.g., years), suitable for plotting on a chart. Extract up to 5 recent periods if data is available. The 'name' field should be the year or period name.")
});
export type AnalyzeFinancialStatementOutput = z.infer<typeof AnalyzeFinancialStatementOutputSchema>;

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
    *   **keyMetrics:** Extract historical data for 'revenue' and 'netIncome' for the last few periods (up to 5, if available). Structure this as an array of objects with 'name', 'revenue', and 'netIncome'.

{format_instructions}`;

export async function analyzeFinancialStatement(input: AnalyzeFinancialStatementInput): Promise<AnalyzeFinancialStatementOutput> {
  try {
    // Step 1: Extract text from PDF with timeout
    console.log('Extracting text from PDF...');
    const { text, numPages } = await withFileOperationTimeout(
      extractTextFromPDF(input.pdfDataUri),
      TIMEOUTS.PDF_EXTRACTION
    );
    const cleanedText = cleanPDFText(text);

    console.log(`Extracted ${cleanedText.length} characters from ${numPages} pages`);

    if (!cleanedText || cleanedText.length < 100) {
      throw new Error('Insufficient text extracted from PDF. Please ensure the PDF contains readable text.');
    }

    // Step 2: Set up structured output parser
    const parser = StructuredOutputParser.fromZodSchema(AnalyzeFinancialStatementOutputSchema);
    const formatInstructions = parser.getFormatInstructions();

    // Step 3: Create prompt template
    const promptTemplate = new PromptTemplate({
      template: SYSTEM_PROMPT + '\n\nLanguage: {language}\n\nFinancial Statement Text:\n{documentText}',
      inputVariables: ['language', 'documentText'],
      partialVariables: { format_instructions: formatInstructions },
    });

    // Step 4: Format prompt with context limit
    const prompt = await promptTemplate.format({
      language: input.language === 'ar' ? 'Arabic' : 'English',
      documentText: cleanedText.slice(0, CONTEXT_LIMITS.FINANCIAL_STATEMENT), // Limit to configured chars
    });

    // Step 5: Invoke LLM with timeout
    console.log('Analyzing financial statement with LLM...');
    const llm = getLLM();
    const response = await withLLMTimeout(llm.invoke(prompt));

    // Step 6: Parse structured output
    const result = await parser.parse(response.content as string);

    console.log('Financial analysis completed successfully');
    return result;

  } catch (error) {
    console.error('Financial statement analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide user-friendly error messages
    if (errorMessage.includes('timed out')) {
      throw new Error('Analysis timed out. The document may be too large or complex. Please try a smaller file or try again.');
    }
    
    throw new Error(`Failed to analyze financial statement: ${errorMessage}`);
  }
}
