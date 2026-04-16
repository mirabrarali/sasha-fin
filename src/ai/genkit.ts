import 'server-only';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { retry } from 'genkit/model/middleware';

function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY (or GOOGLE_GENAI_API_KEY) is required. Set it in your environment variables.'
    );
  }
  return apiKey;
}

const geminiApiKey = getGeminiApiKey();

export const ai = genkit({
  plugins: [googleAI({ apiKey: geminiApiKey })],
});

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const FAST_MODEL = process.env.GEMINI_FAST_MODEL || 'gemini-2.5-flash-lite';

export function defaultModel(config?: Record<string, unknown>) {
  return googleAI.model(DEFAULT_MODEL, config ?? {});
}

export function fastModel(config?: Record<string, unknown>) {
  return googleAI.model(FAST_MODEL, config ?? {});
}

export const defaultRetryMiddleware = retry({
  maxRetries: 2,
  initialDelayMs: 600,
  backoffFactor: 2,
});
