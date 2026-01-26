'use server';

/**
 * @fileOverview A flow for analyzing loan data from a CSV file.
 *
 * - analyzeLoan - A function that handles the loan analysis.
 * - AnalyzeLoanInput - The input type for the analyzeLoan function.
 * - AnalyzeLoanOutput - The return type for the analyzeLoan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { loanDataCsv } from '@/data/loan_data';

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

export async function analyzeLoan(input: AnalyzeLoanInput): Promise<AnalyzeLoanOutput> {
  return analyzeLoanFlow(input);
}

const AnalyzeLoanPromptInputSchema = AnalyzeLoanInputSchema.extend({
  csvData: z.string(),
});

const analyzeLoanPrompt = ai.definePrompt({
  name: 'analyzeLoanPrompt',
  input: {schema: AnalyzeLoanPromptInputSchema},
  output: {schema: AnalyzeLoanOutputSchema},
  prompt: `You are an expert bank analyst. Your task is to analyze a specific customer account from a provided CSV dataset. Even though this flow is for "loan analysis", you should adapt your analysis for the provided customer account data. Your entire report MUST be written in the following language: {{{language}}}.

Find the row in the following CSV data that corresponds to the AccountNumber: {{{loanId}}}.

Once you have located the correct account, perform a comprehensive analysis based on all available columns for that row.

Generate a report with the following sections, interpreting them for a general bank account:
1.  **summary:** Provide a detailed AI-generated summary of the customer's account profile and financial standing based on the data.
2.  **prediction:** Based on the balance and account status, make a 'prediction' about the customer's financial stability. You can use terms like 'Stable', 'High Value', 'Needs Attention'. This is a proxy for loan risk prediction.
3.  **eligibility:** Based on the analysis, provide a statement on their 'eligibility' for premium bank services or special offers. This is a proxy for loan eligibility.

Here is the CSV data:
\`\`\`csv
{{{csvData}}}
\`\`\`

Analyze the account with AccountNumber: {{{loanId}}}.`,
});

const analyzeLoanFlow = ai.defineFlow(
  {
    name: 'analyzeLoanFlow',
    inputSchema: AnalyzeLoanInputSchema,
    outputSchema: AnalyzeLoanOutputSchema,
  },
  async (input) => {
    const promptInput = {
      ...input,
      csvData: loanDataCsv,
    };
    const {output} = await analyzeLoanPrompt(promptInput);
    return output!;
  }
);
