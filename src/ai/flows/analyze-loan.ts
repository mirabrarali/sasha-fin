'use server';

/**
 * @fileOverview Loan Analysis using Genkit + Gemini
 */

import { ai, defaultModel, fastModel, defaultRetryMiddleware } from '@/ai/genkit';
import { z } from 'genkit';
import { loanDataCsv } from '@/data/loan_data';
import { withPrimaryThenFastGemini } from '@/lib/gemini-model-fallback';
import { withLLMTimeout } from '@/lib/timeout-utils';
import { TIMEOUTS } from '@/lib/constants';

const AnalyzeLoanInputSchema = z.object({
  loanId: z.string().describe('The specific AccountNumber to analyze from the CSV data.'),
  language: z.enum(['en', 'ar']).default('en').describe('The language for the response, either English (en) or Arabic (ar).'),
});
export type AnalyzeLoanInput = z.infer<typeof AnalyzeLoanInputSchema>;

const AnalyzeLoanOutputSchema = z.object({
  summary: z.string().describe("A detailed AI-generated summary of the customer's account profile, analyzing all key factors."),
  prediction: z.string().describe('A prediction of the customer\'s financial stability (e.g., "Stable", "High Value", "Needs Attention").'),
  eligibility: z.string().describe('A definitive statement on the customer\'s eligibility for premium services or special offers.'),
});
export type AnalyzeLoanOutput = z.infer<typeof AnalyzeLoanOutputSchema>;

const SYSTEM_PROMPT = `You are an expert bank analyst. Your task is to analyze a specific customer account from a provided CSV dataset.

Find the row in the following CSV data that corresponds to the AccountNumber: {loanId}.

Once you have located the correct account, perform a comprehensive analysis based on all available columns for that row.

Generate a report with the following sections, interpreting them for a general bank account:
1.  **summary:** Provide a detailed AI-generated summary of the customer's account profile and financial standing based on the data.
2.  **prediction:** Based on the balance and account status, make a 'prediction' about the customer's financial stability. You can use terms like 'Stable', 'High Value', 'Needs Attention'. This is a proxy for loan risk prediction.
3.  **eligibility:** Based on the analysis, provide a statement on their 'eligibility' for premium bank services or special offers. This is a proxy for loan eligibility.

Here is the CSV data:
\`\`\`csv
{csvData}
\`\`\`

Analyze the account with AccountNumber: {loanId}.`;

async function runAnalyzeLoan(input: AnalyzeLoanInput): Promise<AnalyzeLoanOutput> {
  try {
    if (!input.loanId || input.loanId.trim().length === 0) {
      throw new Error('Loan ID is required and cannot be empty');
    }

    console.log(`Analyzing loan ${input.loanId}...`);
    const prompt = SYSTEM_PROMPT
      .replaceAll('{loanId}', input.loanId)
      .replace('{csvData}', loanDataCsv)
      .replace('{language}', input.language === 'ar' ? 'Arabic' : 'English');

    const response = await withPrimaryThenFastGemini(
      'analyze-loan',
      () =>
        withLLMTimeout(
          ai.generate({
            model: defaultModel({ temperature: 0.15, maxOutputTokens: 800 }),
            use: [defaultRetryMiddleware],
            prompt,
            output: { schema: AnalyzeLoanOutputSchema },
          }),
          TIMEOUTS.LLM_REQUEST
        ),
      () =>
        withLLMTimeout(
          ai.generate({
            model: fastModel({ temperature: 0.15, maxOutputTokens: 800 }),
            use: [defaultRetryMiddleware],
            prompt,
            output: { schema: AnalyzeLoanOutputSchema },
          }),
          TIMEOUTS.LLM_REQUEST
        ),
    );

    const result = response.output;
    if (!result) {
      throw new Error(response.text?.trim() || 'Invalid response from AI model');
    }

    console.log('Loan analysis completed successfully');
    return result;

  } catch (error) {
    console.error('Loan analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide user-friendly error messages
    if (errorMessage.includes('timed out')) {
      throw new Error('Analysis timed out. Please try again.');
    }
    
    throw new Error(`Failed to analyze loan: ${errorMessage}`);
  }
}

export const analyzeLoanFlow = ai.defineFlow(
  {
    name: 'analyzeLoanFlow',
    inputSchema: AnalyzeLoanInputSchema,
    outputSchema: AnalyzeLoanOutputSchema,
  },
  runAnalyzeLoan
);

export async function analyzeLoan(input: AnalyzeLoanInput): Promise<AnalyzeLoanOutput> {
  return analyzeLoanFlow(input);
}
