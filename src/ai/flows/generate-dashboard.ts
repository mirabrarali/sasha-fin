'use server';

/**
 * @fileOverview Data Analysis Dashboard Generation using LangChain + Groq
 * Migrated from Genkit to LangChain for better performance
 * No longer uses vision models - handles all input files via text extraction
 */

import { getLLM } from '@/ai/langchain';
import { extractTextFromFile, cleanText } from '@/lib/pdf-extractor';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { CONTEXT_LIMITS, TIMEOUTS } from '@/lib/constants';
import { withLLMTimeout, withFileOperationTimeout } from '@/lib/timeout-utils';

const GenerateDashboardInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A data file (CSV, XLSX, or PDF) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  language: z.enum(['en', 'ar']).default('en').describe('The language for the response, either English (en) or Arabic (ar).'),
});
export type GenerateDashboardInput = z.infer<typeof GenerateDashboardInputSchema>;

const ChartDataSchema = z.object({
  labels: z.array(z.string()).describe('The labels for the chart axes or segments.'),
  datasets: z.array(z.object({
    label: z.string().describe('The label for the dataset.'),
    data: z.array(z.number()).describe('The numerical data for the dataset.'),
  })).describe('The datasets to be plotted.'),
});

const GenerateDashboardOutputSchema = z.object({
  title: z.string().describe("A title for the dashboard, reflecting the content of the data."),
  summary: z.string().describe("A multi-paragraph summary of the data, highlighting key trends, patterns, and anomalies."),
  keyInsights: z.array(z.string()).describe("A list of 3-5 bullet-point insights that are actionable or particularly noteworthy."),
  charts: z.array(z.object({
    type: z.enum(['bar', 'pie']).describe("The type of chart to generate."),
    title: z.string().describe("The title of the chart."),
    data: ChartDataSchema.describe("The data for the chart, formatted for Chart.js."),
  })).describe("An array of up to 2 charts (one bar, one pie if possible) to visualize the data. The data should be directly usable by Chart.js.")
});
export type GenerateDashboardOutput = z.infer<typeof GenerateDashboardOutputSchema>;

const SYSTEM_PROMPT = `You are a world-class AI data analyst. Your task is to analyze the provided data and generate a comprehensive, structured dashboard report.

**Analysis Steps:**
1.  **Understand the Data:** Examine the content of the data. Identify categorical and numerical columns, tabular structures, or key textual information.
2.  **Generate a Title:** Create a concise, descriptive title for the dashboard based on the data content.
3.  **Create a Comprehensive Summary:** Write an insightful, multi-paragraph summary. Discuss the overall dataset, identify key trends, point out any interesting relationships between columns, and mention any potential outliers or anomalies.
4.  **Extract Key Insights:** Distill your analysis into a list of 3-5 critical, bullet-point insights. These should be the most important takeaways for a business user.
5.  **Propose Visualizations:** Generate the data for up to two compelling charts (Bar or Pie) to visualize the data. Ensure the data is perfectly formatted for Chart.js.

{format_instructions}

Language: {language}`;

export async function generateDashboard(input: GenerateDashboardInput): Promise<GenerateDashboardOutput> {
  try {
    // Step 1: Extract text from file with timeout
    console.log('Extracting data from file...');
    const { text, type } = await withFileOperationTimeout(
      extractTextFromFile(input.fileDataUri),
      TIMEOUTS.FILE_UPLOAD
    );
    const cleanedText = cleanText(text);

    console.log(`Extracted ${cleanedText.length} characters from ${type} file`);

    if (!cleanedText || cleanedText.length < 50) {
      throw new Error('Insufficient data extracted from file. Please ensure the file contains readable content.');
    }

    // Step 2: Set up structured output parser
    const parser = StructuredOutputParser.fromZodSchema(GenerateDashboardOutputSchema);
    const formatInstructions = parser.getFormatInstructions();

    // Step 3: Create prompt template
    const promptTemplate = new PromptTemplate({
      template: SYSTEM_PROMPT + '\n\nData Content ({type}):\n{dataContent}',
      inputVariables: ['language', 'type', 'dataContent'],
      partialVariables: { format_instructions: formatInstructions },
    });

    // Step 4: Format prompt with context limit
    const prompt = await promptTemplate.format({
      language: input.language === 'ar' ? 'Arabic' : 'English',
      type: type.toUpperCase(),
      dataContent: cleanedText.slice(0, CONTEXT_LIMITS.DASHBOARD), // Limit to configured chars
    });

    // Step 5: Invoke LLM with timeout
    console.log('Generating dashboard analysis...');
    const llm = getLLM();
    const response = await withLLMTimeout(llm.invoke(prompt));

    // Step 6: Parse structured output
    const result = await parser.parse(response.content as string);

    console.log('Dashboard generation completed successfully');
    return result;

  } catch (error) {
    console.error('Dashboard generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide user-friendly error messages
    if (errorMessage.includes('timed out')) {
      throw new Error('Dashboard generation timed out. The file may be too large or complex. Please try a smaller file or try again.');
    }
    
    throw new Error(`Failed to generate dashboard: ${errorMessage}`);
  }
}
