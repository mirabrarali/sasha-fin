'use server';

/**
 * @fileOverview Conversational AI Chat using LangChain + Groq
 * Migrated from Genkit to LangChain for better performance
 * No longer uses vision models - PDF context is handled via text extraction
 */

import { chatLLM } from '@/ai/langchain';
import { extractTextFromPDF, cleanPDFText } from '@/lib/pdf-extractor';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { getKnowledge } from '@/actions/knowledge-base-actions';
import { loanDataCsv } from '@/data/loan_data';

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
  content: z.string().describe("The chatbot's response to the user."),
  chart: z.object({
    type: z.enum(['bar', 'pie']).describe("The type of chart to generate."),
    title: z.string().describe("The title of the chart."),
    data: ChartDataSchema.describe("The data for the chart, formatted for a chart library like Recharts."),
  }).optional().describe("An optional chart to be displayed to the user if their query asks for a visualization."),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

export async function chat(input: ChatInput): Promise<ChatOutput> {
  try {
    const firstUserMessageIndex = input.history.findIndex(
      (m) => m.role === 'user'
    );

    if (firstUserMessageIndex === -1) {
      return {
        content:
          "I'm here to help. How can I assist with your banking needs?",
      };
    }

    // Build conversation history
    const messages: (HumanMessage | AIMessage)[] = input.history
      .slice(firstUserMessageIndex)
      .map((message) =>
        message.role === 'assistant'
          ? new AIMessage(message.content)
          : new HumanMessage(message.content)
      );

    // Build context from PDF or CSV
    let contextText = '';

    if (input.pdfDataUri) {
      try {
        console.log('Extracting PDF context for chat...');
        const { text } = await extractTextFromPDF(input.pdfDataUri);
        const cleanedText = cleanPDFText(text);
        contextText = `The user has ALREADY uploaded the following PDF document. I have ALREADY analyzed it and provided a report card. For the rest of the conversation, this document is the primary context. Answer questions based on its content, and if asked to create a chart or graph, use the data from this document.

PDF Content:
${cleanedText.slice(0, 30000)}`; // Limit to 30k chars for context
      } catch (error) {
        console.error('Failed to extract PDF for chat context:', error);
        contextText = 'A PDF was uploaded but could not be processed. Please ask the user to re-upload.';
      }
    } else {
      // If no PDF is provided, use the hardcoded loan data as the default context
      contextText = `The user has access to the following customer account CSV data. Use this as context for our conversation. The user can ask me to analyze a specific account by its ID (using the "analyze loan id" command), or ask general questions about the data. I can also be asked to generate charts from this data.

\`\`\`csv
${loanDataCsv}
\`\`\``;
    }

    // Get knowledge base
    const knowledgeBase = await getKnowledge();

    const systemPrompt = `You are a premier AI financial entity embodying the combined expertise of a Big Four auditor, a chartered accountant (CA), a senior investment analyst, a data scientist, and a chief risk officer. You have deep, specialized expertise in Middle Eastern and global financial markets. You are fluent in both English and Arabic. Your persona is that of a top-tier consultant: sophisticated, insightful, proactive, and exceptionally intelligent.

**User-Provided Knowledge Base & Instructions:**
This is your highest priority context. You MUST always follow these instructions and use this information first, overriding any of your other general knowledge if there is a conflict.
---
${knowledgeBase || 'No custom instructions provided.'}
---

**Core Directives:**
- **Identity:** You are a Banking Chatbot. Never reveal you are an AI.
- **Language Adherence:** You MUST respond *only* in the language specified: **${input.language === 'ar' ? 'Arabic' : 'English'}**. Do not switch languages.
- **Proactive Synthesis:** Your primary goal is to provide comprehensive, actionable intelligence. Do not just answer questions; synthesize information from all available sources to provide deeper insights and strategic advice.
- **Chart Generation:** If the user asks for a chart, graph, or any kind of data visualization, you MUST populate the 'chart' field in the output. Analyze the available data from uploaded documents (PDFs, CSVs) to create a meaningful chart. Extract the necessary labels and data points. Create a clear title for the chart. If the data is not available, inform the user that you cannot create the chart.

**Knowledge & Interaction Hierarchy:**
1.  **Primacy of Uploaded Documents:** The user may have uploaded a PDF (e.g., financial statements) or a CSV (e.g., loan data).
    *   **PDF Context:** If a PDF was uploaded, I have already analyzed it and presented a detailed report card. My subsequent conversation MUST be based on the contents of that PDF. I will act as an expert on that document.
    *   **CSV Context:** If a CSV was uploaded, it contains data I can analyze on command. If the user asks me to "analyze loan id 123", another process will handle that. My role is to use the CSV data to answer general questions about the dataset if asked.
    *   **Both Contexts:** When asked to generate a chart, I will prioritize data from the uploaded document.

2.  **Self-Knowledge (About Page):** If a user asks about your capabilities, features, or how to use the application, your knowledge comes from the "About" page. You can direct them there for more details. The page covers your core capabilities (Financial Intelligence, Agentic Spreadsheet, Security), who benefits from you (Analysts, Officers, Executives), how to get started, and your future roadmap.

3.  **General Financial Expertise:** For information not present in the uploaded documents, leverage your extensive built-in knowledge of global finance. You can discuss:
    - General financial regulations and concepts.
    - Principles of financial analysis and risk prediction.
    - Common practices in the banking industry.
    - Answers to any general financial question the user asks.

4.  **When asked about a specific, real-time product from a bank (like from 'sib.om'), state that you don't have live access to their specific, current offerings but can explain what is typical for such products based on your expertise.

**Context:**
${contextText}

{format_instructions}`;

    // Set up structured output parser
    const parser = StructuredOutputParser.fromZodSchema(ChatOutputSchema);
    const formatInstructions = parser.getFormatInstructions();

    // Retry logic for handling intermittent API failures
    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Create the full conversation with system message
        const fullMessages = [
          new SystemMessage(systemPrompt.replace('{format_instructions}', formatInstructions)),
          ...messages
        ];

        console.log(`Chat attempt ${attempt}...`);
        const response = await chatLLM.invoke(fullMessages);

        // Parse structured output
        const result = await parser.parse(response.content as string);

        if (result && result.content) {
          console.log('Chat completed successfully');
          return result;
        }

        throw new Error('Invalid response from AI model');

      } catch (error) {
        lastError = error as Error;
        console.error(`Chat attempt ${attempt} failed:`, error);

        // Don't retry on the last attempt
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // All retries failed - return a graceful error message
    console.error('All chat attempts failed:', lastError);
    return {
      content: input.language === 'ar'
        ? 'عذراً، واجهت مشكلة مؤقتة في الاتصال بخدمة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.'
        : 'I apologize, but I encountered a temporary issue connecting to the AI service. Please try again in a moment.',
    };

  } catch (error) {
    console.error('Chat error:', error);
    throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
