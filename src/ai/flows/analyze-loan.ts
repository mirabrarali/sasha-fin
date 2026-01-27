'use server';

/**
 * @fileOverview Loan Analysis using LangChain + Groq
 * Migrated from Genkit to LangChain for better performance
 */

import { llm } from '@/ai/langchain';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
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

const SYSTEM_PROMPT = `You are an expert bank analyst. Your task is to analyze a specific customer account from a provided CSV dataset. Even though this flow is for "loan analysis", you should adapt your analysis for the provided customer account data.

Find the row in the following CSV data that corresponds to the AccountNumber: {loanId}.

Once you have located the correct account, perform a comprehensive analysis based on all available columns for that row.

Generate a report with the following sections, interpreting them for a general bank account:
1.  **summary:** Provide a detailed AI-generated summary of the customer's account profile and financial standing based on the data.
2.  **prediction:** Based on the balance and account status, make a 'prediction' about the customer's financial stability. You can use terms like 'Stable', 'High Value', 'Needs Attention'. This is a proxy for loan risk prediction.
3.  **eligibility:** Based on the analysis, provide a statement on their 'eligibility' for premium bank services or special offers. This is a proxy for loan eligibility.

{format_instructions}

Here is the CSV data:
\`\`\`csv
{csvData}
\`\`\`

Analyze the account with AccountNumber: {loanId}.`;

export async function analyzeLoan(input: AnalyzeLoanInput): Promise<AnalyzeLoanOutput> {
  try {
    // Set up structured output parser
    const parser = StructuredOutputParser.fromZodSchema(AnalyzeLoanOutputSchema);
    const formatInstructions = parser.getFormatInstructions();

    // Create prompt template
    const promptTemplate = new PromptTemplate({
      template: SYSTEM_PROMPT,
      inputVariables: ['loanId', 'csvData', 'language'],
      partialVariables: { format_instructions: formatInstructions },
    });

    // Format prompt
    const prompt = await promptTemplate.format({
      loanId: input.loanId,
      csvData: loanDataCsv,
      language: input.language === 'ar' ? 'Arabic' : 'English',
    });

    // Invoke LLM
    console.log(`Analyzing loan ${input.loanId}...`);
    const response = await llm.invoke(prompt);

    // Parse structured output
    const result = await parser.parse(response.content as string);

    console.log('Loan analysis completed successfully');
    return result;

  } catch (error) {
    console.error('Loan analysis error:', error);
    throw new Error(`Failed to analyze loan: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
