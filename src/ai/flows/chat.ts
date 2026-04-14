'use server';

/**
 * @fileOverview Conversational AI Chat using LangChain + Groq
 * Migrated from Genkit to LangChain for better performance
 * No longer uses vision models - PDF context is handled via text extraction
 */

import { getChatLLM } from '@/ai/langchain';
import { buildDocumentContextForChat } from '@/lib/document-chat-context';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import {
  structuredParserFromZod,
  toLlmText,
  type LooseStructuredParser,
} from '@/lib/langchain-output-utils';
import { z } from 'zod';
import { getKnowledge } from '@/actions/knowledge-base-actions';
import { loanDataCsv } from '@/data/loan_data';
import { RETRY_CONFIG, TIMEOUTS } from '@/lib/constants';
import { withLLMTimeout } from '@/lib/timeout-utils';

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
      'An uploaded document (PDF, spreadsheets, CSV/TSV, JRN, JSON, text, etc.) as a data URI for conversation context.'
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

/** If the model leaks JSON or fences into the visible `content`, normalize to prose only. */
function sanitizeDisplayedChatContent(raw: string): string {
  const s = raw.trim();
  if (!s) return raw;

  const wholeFence = s.match(/^```(?:json)?\s*([\s\S]*?)```$/im);
  if (wholeFence?.[1]) {
    try {
      const data = JSON.parse(wholeFence[1].trim()) as unknown;
      const checked = ChatOutputSchema.safeParse(data);
      if (checked.success && checked.data.content.trim()) {
        return checked.data.content.trim();
      }
    } catch {
      // keep going
    }
  }

  if (s.startsWith('{') && /"content"\s*:/.test(s)) {
    try {
      const data = JSON.parse(s) as unknown;
      const checked = ChatOutputSchema.safeParse(data);
      if (checked.success && checked.data.content.trim()) {
        return checked.data.content.trim();
      }
    } catch {
      // not JSON
    }
  }

  return raw.trim();
}

function withSanitizedContent(out: ChatOutput): ChatOutput {
  const content = sanitizeDisplayedChatContent(out.content);
  return content === out.content ? out : { ...out, content };
}

async function resolveChatOutput(
  rawResponse: string,
  parser: Pick<LooseStructuredParser, 'parse'>
): Promise<ChatOutput> {
  const text = rawResponse.trim();
  if (!text) {
    throw new Error('Empty model response');
  }

  try {
    const parsed = (await parser.parse(text)) as ChatOutput;
    if (parsed?.content?.trim()) {
      return withSanitizedContent(parsed);
    }
  } catch {
    // fall through
  }

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonCandidate = (fence ? fence[1] : text).trim();
  try {
    const data = JSON.parse(jsonCandidate) as unknown;
    const checked = ChatOutputSchema.safeParse(data);
    if (checked.success && checked.data.content.trim()) {
      return withSanitizedContent(checked.data);
    }
  } catch {
    // not JSON
  }

  return { content: sanitizeDisplayedChatContent(text) };
}

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
        console.log('Building uploaded document context for chat (structured spreadsheet or PDF text)...');
        const documentBlock = await buildDocumentContextForChat(input.pdfDataUri);
        contextText = `The user has ALREADY uploaded a financial document (PDF, spreadsheet, or CSV). I have ALREADY analyzed it and provided a report card. For the rest of the conversation, this document is the primary context. Answer questions based on its content, and if asked to create a chart or graph, use the data from this document.

Document content:
${documentBlock}`;
      } catch (error) {
        console.error('Failed to extract uploaded file for chat context:', error);
        contextText =
          'A document was uploaded but could not be processed. Please ask the user to re-upload a valid PDF, CSV, or XLSX file.';
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
- **Visible reply (critical):** The user only sees the structured field \`content\`. Write **natural conversational prose** there—complete sentences, as in a normal banking chat. **Never** put JSON, markdown \`\`\` fences, schema key names, or machine-readable blobs inside \`content\`. If you follow the format instructions below, the outer structure is handled separately; \`content\` must read like a human analyst, not like code.
- **Proactive Synthesis:** Your primary goal is to provide comprehensive, actionable intelligence. Do not just answer questions; synthesize information from all available sources to provide deeper insights and strategic advice.
- **Chart Generation:** If the user asks for a chart, graph, or any kind of data visualization, you MUST populate the 'chart' field in the output. Analyze the available data from uploaded documents (PDFs, CSVs) to create a meaningful chart. Extract the necessary labels and data points. Create a clear title for the chart. If the data is not available, inform the user that you cannot create the chart.
- **Spreadsheet / CSV precision:** When the document includes a **GROUND TRUTH** section (SheetJS parse), treat the stated **data row count**, **column names**, and **JSON/CSV samples** as authoritative. Do not guess counts or invent rows; if the user asks for all names and the sample is partial, say how many rows exist and list what appears in the provided excerpt.

**Knowledge & Interaction Hierarchy:**
1.  **Primacy of Uploaded Documents:** The user may have uploaded a PDF, CSV, or Excel spreadsheet (e.g., financial statements or tabular data).
    *   **Uploaded file context:** If a document was uploaded, I have already analyzed it and presented a detailed report card. My subsequent conversation MUST be based on the contents of that file. I will act as an expert on that document.
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

    const parser = structuredParserFromZod(ChatOutputSchema);
    const formatInstructions = parser.getFormatInstructions();

    // Retry logic for handling intermittent API failures
    let lastError: Error | null = null;
    const maxRetries = RETRY_CONFIG.MAX_ATTEMPTS;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Create the full conversation with system message
        const fullMessages = [
          new SystemMessage(systemPrompt.replace('{format_instructions}', formatInstructions)),
          ...messages
        ];

        console.log(`Chat attempt ${attempt}...`);
        
        // Invoke LLM with timeout
        const chatLLM = getChatLLM();
        const response = await withLLMTimeout(
          chatLLM.invoke(fullMessages),
          TIMEOUTS.LLM_CHAT
        );

        const result = await resolveChatOutput(toLlmText(response.content), parser);

        if (result?.content?.trim()) {
          console.log('Chat completed successfully');
          return result;
        }

        throw new Error('Invalid response from AI model');

      } catch (error) {
        lastError = error as Error;
        console.error(`Chat attempt ${attempt} failed:`, error);

        // Don't retry on the last attempt
        if (attempt < maxRetries) {
          // Exponential backoff
          const delayMs = RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt - 1);
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
