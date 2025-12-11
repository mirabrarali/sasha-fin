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

const AnalyzeLoanInputSchema = z.object({
  csvData: z.string().describe('The loan data in CSV format.'),
  loanId: z.string().describe('The specific Loan ID to analyze from the CSV data.'),
  language: z.enum(['en', 'ar']).default('en').describe('The language for the response, either English (en) or Arabic (ar).'),
});
export type AnalyzeLoanInput = z.infer<typeof AnalyzeLoanInputSchema>;

const AnalyzeLoanOutputSchema = z.object({
  summary: z.string().describe("A detailed AI-generated summary of the loan applicant's profile, analyzing all key factors."),
  prediction: z.string().describe('The prediction of loan approval (e.g., "Approved", "Rejected", "High-Risk") with a clear justification.'),
  eligibility: z.string().describe('A definitive statement on the eligibility of the applicant with clear reasons.'),
});
export type AnalyzeLoanOutput = z.infer<typeof AnalyzeLoanOutputSchema>;

export async function analyzeLoan(input: AnalyzeLoanInput): Promise<AnalyzeLoanOutput> {
  return analyzeLoanFlow(input);
}

const analyzeLoanPrompt = ai.definePrompt({
  name: 'analyzeLoanPrompt',
  input: {schema: AnalyzeLoanInputSchema},
  output: {schema: AnalyzeLoanOutputSchema},
  prompt: `You are an expert loan analyst for a bank. Your task is to analyze a specific loan application from a provided CSV dataset. Your entire report MUST be written in the following language: {{{language}}}.

Find the row in the following CSV data that corresponds to the Loan ID: {{{loanId}}}.

Once you have located the correct loan application, perform a comprehensive analysis based on all available columns for that row.

Generate a report with the following sections:
1.  **In-Depth Summary:** Provide a detailed summary of the applicant's profile. Analyze all relevant columns to discuss their financial stability, creditworthiness, employment status, and any other key indicators present in the data.
2.  **Risk Prediction & Justification:** Based on your analysis, predict the likelihood of loan approval. State it clearly (e.g., "Approved", "Rejected", "High-Risk"). Justify your prediction with specific data points from the applicant's profile and explain *why* those factors are important.
3.  **Eligibility Statement:** State definitively whether the applicant is eligible for the loan and provide a clear, concise explanation for your decision, referencing the key factors from your summary and prediction.

Here is the CSV data:
\`\`\`csv
{{{csvData}}}
\`\`\`

Analyze the loan with ID: {{{loanId}}}.
`,
});

const analyzeLoanFlow = ai.defineFlow(
  {
    name: 'analyzeLoanFlow',
    inputSchema: AnalyzeLoanInputSchema,
    outputSchema: AnalyzeLoanOutputSchema,
  },
  async (input) => {
    const {output} = await analyzeLoanPrompt(input);
    return output!;
  }
);
