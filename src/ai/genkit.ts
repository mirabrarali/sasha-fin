
import { genkit } from 'genkit';
import { groq, llama33x70bVersatile } from 'genkitx-groq';

// Default configuration using Groq's Llama 3.3 70B Versatile model
export const ai = genkit({
  plugins: [groq({ apiKey: process.env.GROQ_API_KEY })],
  model: llama33x70bVersatile,
});
