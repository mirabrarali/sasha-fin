import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This is the default configuration using Google's Gemini model
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
