# Banking Chatbot - Financial AI Assistant

This is a Next.js application that provides an AI-powered financial assistant. The chatbot can analyze financial documents, assist with spreadsheet tasks, and engage in conversational chat about financial topics.

## Core Features

*   **Conversational Chat:** Engage with the chatbot for financial analysis, document queries, and general market discussion.
*   **Document Analysis:** Upload PDF financial statements or CSV loan data for institutional-grade analysis and reporting.
*   **Agentic Spreadsheet:** A fully-featured spreadsheet environment where the chatbot can be commanded via natural language to perform complex tasks like financial modeling, data entry, and chart creation.
*   **Data Analytics Dashboard:** Upload a dataset (CSV, XLSX, PDF) and have the chatbot instantly generate a dashboard with summaries, key insights, and visualizations.
*   **Customizable Knowledge Base:** Teach the chatbot specific rules, facts, and instructions that it will remember across all interactions.
*   **Bilingual:** All features work seamlessly in both English and Arabic.

## Tech Stack

*   **Framework:** Next.js (App Router)
*   **UI:** React, TypeScript, ShadCN UI, Tailwind CSS
*   **AI/Generative:** Groq Llama 3.1 Instant via Genkit
*   **Spreadsheet:** Handsontable
*   **Charts:** Recharts, Chart.js

## Getting Started

To run the application locally, you will need to set up your environment.

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a file named `.env` in the root of your project and add your Groq API key. You can get a key from the [Groq Console](https://console.groq.com).

```
GROQ_API_KEY=YOUR_GROQ_API_KEY_HERE
```

### 3. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:9002`.

## Genkit AI Configuration

The AI model is configured in `src/ai/genkit.ts`. It now uses the powerful `llama-3.3-70b-versatile` model via Groq for high-quality, structured JSON responses.

```typescript
// src/ai/genkit.ts
import { genkit } from 'genkit';
import { groq, llama33x70bVersatile } from 'genkitx-groq';

export const ai = genkit({
  plugins: [groq({ apiKey: process.env.GROQ_API_KEY })],
  model: llama33x70bVersatile,
});
```

All AI-powered logic (flows) can be found in the `src/ai/flows/` directory.
