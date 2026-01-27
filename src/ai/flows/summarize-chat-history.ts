'use server';

/**
 * @fileOverview Summarizes chat history using LangChain + Groq
 * Migrated from Genkit to LangChain for better performance
 */

import { fastLLM } from '@/ai/langchain';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
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
    // Set up structured output parser
    const parser = StructuredOutputParser.fromZodSchema(SummarizeChatHistoryOutputSchema);
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

    // Parse structured output
    const result = await parser.parse(response.content as string);

    console.log('Summarization completed successfully');
    return result;

  } catch (error) {
    console.error('Summarization error:', error);
    throw new Error(`Failed to summarize chat history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
