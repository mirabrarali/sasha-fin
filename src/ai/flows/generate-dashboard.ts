'use server';

/**
 * @fileOverview Data Analysis Dashboard Generation using Genkit + Gemini
 * No longer uses vision models - handles all input files via text extraction
 */

import { ai, defaultModel, fastModel } from '@/ai/genkit';
import { extractTextFromFile, cleanText } from '@/lib/pdf-extractor';
import {
  getFriendlyGeminiUnavailableMessage,
  isTransientGeminiError,
  withTransientGeminiRetries,
} from '@/lib/gemini-transient-retry';
import { z } from 'genkit';
import { CONTEXT_LIMITS, TIMEOUTS } from '@/lib/constants';
import { withPrimaryThenFastGemini } from '@/lib/gemini-model-fallback';
import { withLLMTimeout, withFileOperationTimeout } from '@/lib/timeout-utils';

const GenerateDashboardInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A data file (CSV, XLSX, PDF, or journal .jrn) as a data URI with MIME type and Base64 payload: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  language: z.enum(['en', 'ar']).default('en').describe('The language for the response, either English (en) or Arabic (ar).'),
});
export type GenerateDashboardInput = z.infer<typeof GenerateDashboardInputSchema>;

const ChartDataSchema = z.object({
  labels: z.array(z.string()).describe('The labels for the chart axes or segments.'),
  datasets: z
    .array(
      z.object({
        label: z.string().describe('The label for the dataset.'),
        data: z.array(z.number()).describe('The numerical data for the dataset.'),
      })
    )
    .describe('The datasets to be plotted.'),
});

const GenerateDashboardOutputSchema = z.object({
  title: z.string().describe('A title for the dashboard, reflecting the content of the data.'),
  summary: z.string().describe('A multi-paragraph summary of the data, highlighting key trends, patterns, and anomalies.'),
  keyInsights: z.array(z.string()).describe('A list of 3-5 bullet-point insights that are actionable or particularly noteworthy.'),
  charts: z
    .array(
      z.object({
        type: z.enum(['bar', 'pie']).describe('The type of chart to generate.'),
        title: z.string().describe('The title of the chart.'),
        data: ChartDataSchema.describe('The data for the chart, formatted for Chart.js.'),
      })
    )
    .describe(
      'An array of up to 2 charts (one bar, one pie if possible) to visualize the data. The data should be directly usable by Chart.js.'
    ),
});
export type GenerateDashboardOutput = z.infer<typeof GenerateDashboardOutputSchema>;

const DASHBOARD_MAX_OUTPUT_TOKENS = 2_400;
const DASHBOARD_TIMEOUT_MS = Math.min(TIMEOUTS.LLM_CHAT, 25_000);

const SYSTEM_PROMPT = `You are a world-class AI data analyst. Analyze the provided data and produce a structured dashboard report.

**Analysis Steps:**
1.  **Understand the Data:** Examine the content of the data. Identify categorical and numerical columns, tabular structures, or key textual information.
2.  **Generate a Title:** Create a concise, descriptive title for the dashboard based on the data content.
3.  **Create a Comprehensive Summary:** Write an insightful, multi-paragraph summary. Discuss the overall dataset, identify key trends, point out any interesting relationships between columns, and mention any potential outliers or anomalies.
4.  **Extract Key Insights:** Distill your analysis into a list of 3-5 critical, bullet-point insights. These should be the most important takeaways for a business user.
5.  **Propose Visualizations:** Generate data for up to two charts. Prefer one bar chart plus one pie chart when data allows. Every chart must include non-empty labels[] and datasets[] with numeric data[] aligned to labels.

Language: {language}`;

function isStructuredOutputSchemaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.includes('Schema validation failed') || message.includes('must have required property');
}

function parseDashboardFromText(rawText: string): GenerateDashboardOutput | null {
  const text = rawText.trim();
  if (!text) return null;
  const tryParse = (candidate: string): GenerateDashboardOutput | null => {
    try {
      const data = JSON.parse(candidate.trim()) as unknown;
      const checked = GenerateDashboardOutputSchema.safeParse(data);
      return checked.success ? checked.data : null;
    } catch {
      return null;
    }
  };
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    const fromFence = tryParse(fence[1]);
    if (fromFence) return fromFence;
  }
  return tryParse(text);
}

async function runGenerateDashboard(input: GenerateDashboardInput): Promise<GenerateDashboardOutput> {
  try {
    console.log('Extracting data from file...');
    const { text, type } = await withFileOperationTimeout(
      extractTextFromFile(input.fileDataUri),
      TIMEOUTS.FILE_UPLOAD
    );
    const cleanedText = cleanText(text);

    console.log(`Extracted ${cleanedText.length} characters from ${type} file`);

    if (!cleanedText || cleanedText.length < 25) {
      throw new Error('Insufficient data extracted from file. Please ensure the file contains readable content.');
    }

    const prompt = `${SYSTEM_PROMPT.replace(
      '{language}',
      input.language === 'ar' ? 'Arabic' : 'English'
    )}\n\nData Content (${type.toUpperCase()}):\n${cleanedText.slice(0, CONTEXT_LIMITS.DASHBOARD)}`;

    console.log('Generating dashboard analysis...');

    const runStructured = () =>
      withTransientGeminiRetries(
        'dashboard structured',
        () =>
          withLLMTimeout(
            withPrimaryThenFastGemini(
              'dashboard structured',
              () =>
                ai.generate({
                  model: defaultModel({ temperature: 0.2, maxOutputTokens: DASHBOARD_MAX_OUTPUT_TOKENS }),
                  prompt,
                  output: { schema: GenerateDashboardOutputSchema },
                }),
              () =>
                ai.generate({
                  model: fastModel({ temperature: 0.2, maxOutputTokens: DASHBOARD_MAX_OUTPUT_TOKENS }),
                  prompt,
                  output: { schema: GenerateDashboardOutputSchema },
                }),
            ),
            DASHBOARD_TIMEOUT_MS
          ),
        { maxAttempts: 2, maxSleepMs: 2_500 }
      );

    let result: GenerateDashboardOutput | null = null;

    try {
      const response = await runStructured();
      if (response.output) {
        result = response.output;
      } else {
        result = parseDashboardFromText(response.text ?? '');
      }
    } catch (error) {
      if (isStructuredOutputSchemaError(error)) {
        console.warn('Dashboard structured output failed; retrying with JSON-as-text...');
        const textRetry = await withTransientGeminiRetries(
          'dashboard json-as-text',
          () =>
            withLLMTimeout(
              withPrimaryThenFastGemini(
                'dashboard json-as-text',
                () =>
                  ai.generate({
                    model: defaultModel({ temperature: 0.15, maxOutputTokens: DASHBOARD_MAX_OUTPUT_TOKENS }),
                    prompt: `${prompt}\n\nReturn ONLY valid JSON matching the schema (no markdown fences, no commentary).`,
                  }),
                () =>
                  ai.generate({
                    model: fastModel({ temperature: 0.15, maxOutputTokens: DASHBOARD_MAX_OUTPUT_TOKENS }),
                    prompt: `${prompt}\n\nReturn ONLY valid JSON matching the schema (no markdown fences, no commentary).`,
                  }),
              ),
              Math.min(DASHBOARD_TIMEOUT_MS, 12_000)
            ),
          { maxAttempts: 2, maxSleepMs: 2_500 }
        );
        result = parseDashboardFromText(textRetry.text ?? '');
      } else {
        throw error;
      }
    }

    if (!result) {
      throw new Error('Could not parse dashboard JSON from the model response.');
    }

    console.log('Dashboard generation completed successfully');
    return result;
  } catch (error) {
    console.error('Dashboard generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('timed out')) {
      throw new Error('Dashboard generation timed out. The file may be too large or complex. Please try a smaller file or try again.');
    }
    if (isTransientGeminiError(error)) {
      throw new Error(getFriendlyGeminiUnavailableMessage(error));
    }

    throw new Error(`Failed to generate dashboard: ${errorMessage}`);
  }
}

export const generateDashboardFlow = ai.defineFlow(
  {
    name: 'generateDashboardFlow',
    inputSchema: GenerateDashboardInputSchema,
    outputSchema: GenerateDashboardOutputSchema,
  },
  runGenerateDashboard
);

export async function generateDashboard(input: GenerateDashboardInput): Promise<GenerateDashboardOutput> {
  return generateDashboardFlow(input);
}
