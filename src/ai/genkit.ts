
import { genkit } from 'genkit';
import { groq, llama33x70bVersatile } from 'genkitx-groq';

// Using Llama 3.3 70B Versatile for reliable structured JSON output (with retry logic)
export const ai = genkit({
  plugins: [groq({ apiKey: process.env.GROQ_API_KEY })],
  model: llama33x70bVersatile,
});
