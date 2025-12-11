
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Default configuration using Google's Gemini 2.5 Flash model
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
