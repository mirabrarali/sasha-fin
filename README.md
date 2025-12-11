# Abdullah Banking - AI Model Switching Guide

This guide outlines the steps required to switch the underlying AI model for the chat functionality from the default Google Gemini to Llama 3.1 via the Groq provider.

## 1. Install the Groq Genkit Plugin

You will need to add the `@genkit-ai/groq` package to the project's dependencies.

```bash
npm install @genkit-ai/groq
```

## 2. Set Up Your Groq API Key

Create a file named `.env` in the root of your project (if it doesn't exist) and add your Groq API key.

```
GROQ_API_KEY=YOUR_GROQ_API_KEY_HERE
```

## 3. Update the Genkit Configuration

In `src/ai/genkit.ts`, you will find the Genkit AI configuration. The file is already prepared for the switch.

To change the model:
1.  Comment out the existing `googleAI` plugin configuration.
2.  Uncomment the `groq` plugin configuration.

**Example `src/ai/genkit.ts`:**

```typescript
import {genkit} from 'genkit';
// STEP 1: Uncomment the Groq import
// import {groq} from '@genkit-ai/groq';
import {googleAI} from '@genkit-ai/googleai';

// This is the default configuration using Google's Gemini model
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});

/*
// STEP 2: To switch to Llama 3.1, comment out the configuration above
// and uncomment the one below.

export const ai = genkit({
  plugins: [groq()],
  model: 'gemma-7b-it', // Or 'llama3-70b-8192', 'llama3-8b-8192'
});
*/
```

## 4. (Optional) Specify the Model in the Chat Flow

By default, the application will use the model specified in the `genkit` configuration. However, if you want to explicitly set the model for the chat flow, you can do so in `src/ai/flows/chat.ts`.

Find the `ai.generate` call within the `chatFlow` and modify the `model` parameter.

**Example `src/ai/flows/chat.ts`:**

```typescript
    const {output} = await ai.generate({
      // To explicitly use Llama 3.1, uncomment the next line
      // model: 'llama3-70b-8192', 
      system: systemPrompt,
      messages: messages,
      output: {
        schema: ChatOutputSchema
      },
    });
```

By following these steps, you can seamlessly switch the chat functionality to use the Llama 3.1 model. All other features, such as PDF analysis, will continue to work as expected.
# sasha-fin
