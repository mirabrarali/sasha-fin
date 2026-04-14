/**
 * LangChain Configuration with Groq
 * Replaces Genkit with LangChain for better performance and efficiency
 */

import { ChatGroq } from '@langchain/groq';

/**
 * Validates and retrieves the Groq API key
 * Throws a helpful error if missing
 */
function getApiKey(): string {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error(
            'GROQ_API_KEY environment variable is required. ' +
            'Please set it in your .env file. Get your key from: https://console.groq.com'
        );
    }
    return apiKey;
}

/**
 * Creates a ChatGroq instance with lazy API key validation
 * This allows the module to load even if the key is missing initially
 */
function createLLM(config: {
    model: string;
    temperature: number;
    maxTokens: number;
}): ChatGroq {
    return new ChatGroq({
        apiKey: getApiKey(),
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        streaming: false,
    });
}

/**
 * Main LLM instance using Llama 3.3 70B Versatile
 * Optimized for structured JSON output and financial analysis
 * Lazy initialization - validates API key only when first used
 */
let _llm: ChatGroq | null = null;
export function getLLM(): ChatGroq {
    if (!_llm) {
        _llm = createLLM({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1, // Low temperature for consistent, factual responses
            // Keep output budget moderate to avoid Groq TPM "request too large" on big uploads.
            maxTokens: 1800,
        });
    }
    return _llm;
}

// Export for backward compatibility
export const llm = new Proxy({} as ChatGroq, {
    get(_target, prop) {
        return getLLM()[prop as keyof ChatGroq];
    },
});

/**
 * LLM instance for chat conversations
 * Slightly higher temperature for more natural responses
 */
let _chatLLM: ChatGroq | null = null;
export function getChatLLM(): ChatGroq {
    if (!_chatLLM) {
        _chatLLM = createLLM({
            // Use smaller instant model for lower latency + lower token cost in live chat.
            model: 'llama-3.1-8b-instant',
            temperature: 0.25,
            maxTokens: 900,
        });
    }
    return _chatLLM;
}

// Export for backward compatibility
export const chatLLM = new Proxy({} as ChatGroq, {
    get(_target, prop) {
        return getChatLLM()[prop as keyof ChatGroq];
    },
});

/**
 * Fast LLM instance for quick tasks
 * Uses smaller model for speed
 */
let _fastLLM: ChatGroq | null = null;
export function getFastLLM(): ChatGroq {
    if (!_fastLLM) {
        _fastLLM = createLLM({
            model: 'llama-3.1-8b-instant',
            temperature: 0.2,
            maxTokens: 2000,
        });
    }
    return _fastLLM;
}

// Export for backward compatibility
export const fastLLM = new Proxy({} as ChatGroq, {
    get(_target, prop) {
        return getFastLLM()[prop as keyof ChatGroq];
    },
});
