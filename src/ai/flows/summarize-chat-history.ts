'use server';

/**
 * @fileOverview Summarizes chat history using LangChain + Groq
 * Migrated from Genkit to LangChain for better performance
 */

import { fastLLM } from '@/ai/langchain';
import {
  structuredParserFromZod,
  toLlmText,
} from '@/lib/langchain-output-utils';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';

const SummarizeChatHistoryInputSchema = z.object({
  chatHistory: z.string().describe('The complete chat history to summarize.'),
});
export type SummarizeChatHistoryInput = z.infer<typeof SummarizeChatHistoryInputSchema>;

const SummarizeChatHistoryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the chat history.'),
});
export type SummarizeChatHistoryOutput = z.infer<typeof SummarizeChatHistoryOutputSchema>;

const SYSTEM_PROMPT = `Summarize the following chat history. Focus on identifying the key topics discussed, decisions made, and any action items. The summary should be concise and easy to understand.

Chat History:
{chatHistory}

{format_instructions}`;

export async function summarizeChatHistory(input: SummarizeChatHistoryInput): Promise<SummarizeChatHistoryOutput> {
  try {
    const parser = structuredParserFromZod(SummarizeChatHistoryOutputSchema);
    const formatInstructions = parser.getFormatInstructions();

    // Create prompt template
    const promptTemplate = new PromptTemplate({
      template: SYSTEM_PROMPT,
      inputVariables: ['chatHistory'],
      partialVariables: { format_instructions: formatInstructions },
    });

    // Format prompt
    const prompt = await promptTemplate.format({
      chatHistory: input.chatHistory,
    });

    // Invoke LLM (using fast model for simple summarization)
    console.log('Summarizing chat history...');
    const response = await fastLLM.invoke(prompt);

    const raw = toLlmText(response.content).trim();
    if (!raw) {
      throw new Error('Empty model response');
    }

    try {
      const parsed = (await parser.parse(raw)) as SummarizeChatHistoryOutput;
      if (parsed?.summary?.trim()) {
        console.log('Summarization completed successfully');
        return parsed;
      }
    } catch {
      // fall through
    }

    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonCandidate = (fence ? fence[1] : raw).trim();
    try {
      const data = JSON.parse(jsonCandidate) as unknown;
      const checked = SummarizeChatHistoryOutputSchema.safeParse(data);
      if (checked.success && checked.data.summary.trim()) {
        console.log('Summarization completed successfully');
        return checked.data;
      }
    } catch {
      // not JSON
    }

    if (raw.length > 0) {
      console.log('Summarization completed successfully');
      return { summary: raw };
    }

    throw new Error('Invalid response from AI model');

  } catch (error) {
    console.error('Summarization error:', error);
    throw new Error(`Failed to summarize chat history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
