'use server';

/**
 * @fileOverview Summarizes chat history using Genkit + Gemini
 */

import { ai, defaultRetryMiddleware, fastModel } from '@/ai/genkit';
import { z } from 'genkit';
import { withLLMTimeout } from '@/lib/timeout-utils';
import { TIMEOUTS } from '@/lib/constants';

const SummarizeChatHistoryInputSchema = z.object({
  chatHistory: z.string().describe('The complete chat history to summarize.'),
});
export type SummarizeChatHistoryInput = z.infer<typeof SummarizeChatHistoryInputSchema>;

const SummarizeChatHistoryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the chat history.'),
});
export type SummarizeChatHistoryOutput = z.infer<typeof SummarizeChatHistoryOutputSchema>;

const SYSTEM_PROMPT = `Summarize the following chat history.
Focus on key topics discussed, decisions made, and clear action items.
Keep the output concise and easy to understand.`;

async function runSummarizeChatHistory(input: SummarizeChatHistoryInput): Promise<SummarizeChatHistoryOutput> {
  try {
    console.log('Summarizing chat history...');
    const response = await withLLMTimeout(
      ai.generate({
        model: fastModel({ temperature: 0.1, maxOutputTokens: 420 }),
        use: [defaultRetryMiddleware],
        prompt: `${SYSTEM_PROMPT}\n\nChat history:\n${input.chatHistory}`,
        output: { schema: SummarizeChatHistoryOutputSchema },
      }),
      TIMEOUTS.LLM_REQUEST
    );

    if (response.output?.summary?.trim()) {
      console.log('Summarization completed successfully');
      return response.output;
    }

    const raw = (response.text ?? '').trim();
    if (raw) {
      console.log('Summarization completed successfully');
      return { summary: raw };
    }

    throw new Error('Invalid response from AI model');

  } catch (error) {
    console.error('Summarization error:', error);
    throw new Error(`Failed to summarize chat history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const summarizeChatHistoryFlow = ai.defineFlow(
  {
    name: 'summarizeChatHistoryFlow',
    inputSchema: SummarizeChatHistoryInputSchema,
    outputSchema: SummarizeChatHistoryOutputSchema,
  },
  runSummarizeChatHistory
);

export async function summarizeChatHistory(
  input: SummarizeChatHistoryInput
): Promise<SummarizeChatHistoryOutput> {
  return summarizeChatHistoryFlow(input);
}
