
import { genkit } from 'genkit';
import { groq, llama31x8bInstant } from 'genkitx-groq';

// Default configuration using Groq's Llama 3.1 Instant model
export const ai = genkit({
  plugins: [groq({ apiKey: process.env.GROQ_API_KEY })],
  model: llama31x8bInstant,
});
