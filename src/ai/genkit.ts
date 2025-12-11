import {genkit} from 'genkit';
// To switch to Llama 3.1, uncomment the line below and follow the instructions.
// import {groq} from '@genkit-ai/groq';
import {googleAI} from '@genkit-ai/googleai';

// This is the default configuration using Google's Gemini model
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});


/*
// To switch to Llama 3.1 via Groq, comment out the configuration above
// and uncomment the one below.
// Make sure to install the Groq plugin: `npm install @genkit-ai/groq`
// And add your Groq API key to the .env file: `GROQ_API_KEY=your_api_key`

export const ai = genkit({
  plugins: [groq()],
  model: 'llama3-70b-8192', // Or 'gemma-7b-it', 'llama3-8b-8192'
});
*/
