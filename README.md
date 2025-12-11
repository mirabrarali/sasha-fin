# Abdullah Banking - Financial AI Assistant

This is a Next.js application that provides an AI-powered financial assistant named Abdullah. Abdullah can analyze financial documents, assist with spreadsheet tasks, and engage in conversational chat about financial topics.

## Core Features

*   **Conversational Chat:** Engage with Abdullah for financial analysis, document queries, and general market discussion.
*   **Document Analysis:** Upload PDF financial statements or CSV loan data for institutional-grade analysis and reporting.
*   **Agentic Spreadsheet:** A fully-featured spreadsheet environment where Abdullah can be commanded via natural language to perform complex tasks like financial modeling, data entry, and chart creation.
*   **Data Analytics Dashboard:** Upload a dataset (CSV, XLSX, PDF) and have Abdullah instantly generate a dashboard with summaries, key insights, and visualizations.
*   **Customizable Knowledge Base:** Teach Abdullah specific rules, facts, and instructions that he will remember across all interactions.
*   **Bilingual:** All features work seamlessly in both English and Arabic.

## Tech Stack

*   **Framework:** Next.js (App Router)
*   **UI:** React, TypeScript, ShadCN UI, Tailwind CSS
*   **AI/Generative:** Google Gemini via Genkit
*   **Spreadsheet:** Handsontable
*   **Charts:** Recharts, Chart.js

## Getting Started

To run the application locally, you will need to set up your environment.

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a file named `.env` in the root of your project and add your Google Gemini API key. You can get a key from [Google AI Studio](https://aistudio.google.com/app/apikey).

```
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
```

### 3. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:9002`.

## Genkit AI Configuration

The AI model is configured in `src/ai/genkit.ts`. By default, it uses the `gemini-1.5-flash-latest` model.

```typescript
// src/ai/genkit.ts
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash-latest',
});
```

All AI-powered logic (flows) can be found in the `src/ai/flows/` directory.
# sasha-fin
```