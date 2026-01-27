
import { genkit } from 'genkit';
import { groq, llama31x8bInstant } from 'genkitx-groq';

// Default configuration using Groq's Llama 3.1 8B Instant model (with retry logic for reliability)
export const ai = genkit({
  plugins: [groq({ apiKey: process.env.GROQ_API_KEY })],
  model: llama31x8bInstant,
});
