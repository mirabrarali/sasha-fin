/**
 * LangChain Configuration with Groq
 * Replaces Genkit with LangChain for better performance and efficiency
 */

import { ChatGroq } from '@langchain/groq';

if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is required');
}

/**
 * Main LLM instance using Llama 3.3 70B Versatile
 * Optimized for structured JSON output and financial analysis
 */
export const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1, // Low temperature for consistent, factual responses
    maxTokens: 8000,
    streaming: false,
});

/**
 * LLM instance for chat conversations
 * Slightly higher temperature for more natural responses
 */
export const chatLLM = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    maxTokens: 4000,
    streaming: false,
});

/**
 * Fast LLM instance for quick tasks
 * Uses smaller model for speed
 */
export const fastLLM = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: 'llama-3.1-8b-instant',
    temperature: 0.2,
    maxTokens: 2000,
    streaming: false,
});
