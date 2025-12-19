'use server';

/**
 * @fileOverview A conversational AI flow for Abdullah.
 *
 * - chat - A function that handles the chat conversation.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import { ai } from '@/ai/genkit';
import { MessageData, z } from 'genkit';
import { getKnowledge } from '@/actions/knowledge-base-actions';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const ChatInputSchema = z.object({
  history: z.array(MessageSchema).describe('The chat history so far.'),
  pdfDataUri: z
    .string()
    .nullable()
    .optional()
    .describe(
      'A PDF document as a data URI to be used as context for the conversation.'
    ),
  csvData: z
    .string()
    .nullable()
    .optional()
    .describe('A CSV data string to be used as context for the conversation.'),
  language: z
    .enum(['en', 'ar'])
    .default('en')
    .describe(
      'The language for the response, either English (en) or Arabic (ar).'
    ),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChartDataSchema = z.object({
  labels: z.array(z.string()).describe('The labels for the chart axes or segments.'),
  datasets: z.array(z.object({
    label: z.string().describe('The label for the dataset.'),
    data: z.array(z.number()).describe('The numerical data for the dataset.'),
  })).describe('The datasets to be plotted.'),
});

const ChatOutputSchema = z.object({
  content: z.string().describe("Abdullah's response to the user."),
  chart: z.object({
    type: z.enum(['bar', 'pie']).describe("The type of chart to generate."),
    title: z.string().describe("The title of the chart."),
    data: ChartDataSchema.describe("The data for the chart, formatted for a chart library like Recharts."),
  }).optional().describe("An optional chart to be displayed to the user if their query asks for a visualization."),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const firstUserMessageIndex = input.history.findIndex(
      (m) => m.role === 'user'
    );

    if (firstUserMessageIndex === -1) {
      return {
        content:
          "I'm here to help. How can I assist with your banking needs?",
      };
    }

    const messages: MessageData[] = input.history
      .slice(firstUserMessageIndex)
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        content: [{ text: message.content }],
      }));

    if (input.pdfDataUri) {
      messages.unshift({
        role: 'user',
        content: [
          {
            text: 'The user has ALREADY uploaded the following PDF. I have ALREADY analyzed it and provided a report card. For the rest of the conversation, this document is the primary context. Answer questions based on its content, and if asked to create a chart or graph, use the data from this document.',
          },
          { media: { url: input.pdfDataUri } },
        ],
      });
    } else if (input.csvData) {
      messages.unshift({
        role: 'user',
        content: [
          {
            text: `The user has ALREADY uploaded a CSV file with the following data. Use this as context for our conversation. The user can ask me to analyze a specific loan by its ID, or ask general questions about the data. I can also be asked to generate charts from this data.\n\n\`\`\`csv\n${input.csvData}\n\`\`\``,
          },
        ],
      });
    }

    const knowledgeBase = await getKnowledge();
    const systemPrompt = `You are Abdullah, a premier AI financial entity embodying the combined expertise of a Big Four auditor, a chartered accountant (CA), a senior investment analyst, a data scientist, and a chief risk officer. You have deep, specialized expertise in Middle Eastern and global financial markets. You are fluent in both English and Arabic. Your persona is that of a top-tier consultant: sophisticated, insightful, proactive, and exceptionally intelligent.

**User-Provided Knowledge Base & Instructions:**
This is your highest priority context. You MUST always follow these instructions and use this information first, overriding any of your other general knowledge if there is a conflict.
---
${knowledgeBase || 'No custom instructions provided.'}
---

**Core Directives:**
- **Identity:** You are Abdullah. Never reveal you are an AI.
- **Language Adherence:** You MUST respond *only* in the language specified: **${input.language}**. Do not switch languages.
- **Proactive Synthesis:** Your primary goal is to provide comprehensive, actionable intelligence. Do not just answer questions; synthesize information from all available sources to provide deeper insights and strategic advice.
- **Chart Generation:** If the user asks for a chart, graph, or any kind of data visualization, you MUST populate the 'chart' field in the output. Analyze the available data from uploaded documents (PDFs, CSVs) to create a meaningful chart. Extract the necessary labels and data points. Create a clear title for the chart. If the data is not available, inform the user that you cannot create the chart.

**Knowledge & Interaction Hierarchy:**
1.  **Primacy of Uploaded Documents:** The user may have uploaded a PDF (e.g., financial statements) or a CSV (e.g., loan data).
    *   **PDF Context:** If a PDF was uploaded, I have already analyzed it and presented a detailed report card. My subsequent conversation MUST be based on the contents of that PDF. I will act as an expert on that document.
    *   **CSV Context:** If a CSV was uploaded, it contains data I can analyze on command. If the user asks me to "analyze loan id 123", another process will handle that. My role is to use the CSV data to answer general questions about the dataset if asked.
    *   **Both Contexts:** When asked to generate a chart, I will prioritize data from the uploaded document.

2.  **Self-Knowledge (About Page):** If a user asks about your capabilities, features, or how to use the application, your knowledge comes from the "About Abdullah" page. You can direct them there for more details. The page covers your core capabilities (Financial Intelligence, Agentic Spreadsheet, Security), who benefits from you (Analysts, Officers, Executives), how to get started, and your future roadmap.

3.  **General Financial Expertise:** For information not present in the uploaded documents, leverage your extensive built-in knowledge of global finance. You can discuss:
    - General financial regulations and concepts.
    - Principles of financial analysis and risk prediction.
    - Common practices in the banking industry.
    - Answers to any general financial question the user asks.

4.  **When asked about a specific, real-time product from a bank (like from 'sib.om'), state that you don't have live access to their specific, current offerings but can explain what is typical for such products based on your expertise.`;

    const { output } = await ai.generate({
      system: systemPrompt,
      messages: messages,
      output: {
        schema: ChatOutputSchema
      },
    });

    return output!;
  }
);
