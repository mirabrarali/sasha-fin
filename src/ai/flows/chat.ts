
'use server';

/**
 * @fileOverview A conversational AI flow for Abdullah.
 *
 * - chat - A function that handles the chat conversation.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import {ai} from '@/ai/genkit';
import {MessageData, z} from 'genkit';
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

// In-memory store for document chunks and embeddings
const documentStore: {
  [key: string]: { chunks: string[]; embeddings: number[][] };
} = {};

async function processAndIndexDocument(docId: string, content: string, type: 'pdf' | 'csv') {
  if (documentStore[docId]) return; // Already indexed

  let chunks: string[] = [];
  if (type === 'pdf') {
    // Simple chunking for text content, assuming PDF is extracted as text.
    // A more advanced implementation would use a proper PDF text extractor.
    chunks = content.match(/[\s\S]{1,1000}/g) || [];
  } else if (type === 'csv') {
    // Chunk CSV by rows, ensuring the header is in each chunk for context.
    const rows = content.split('\n');
    if (rows.length < 2) {
      chunks.push(content);
    } else {
      const header = rows[0];
      const dataRows = rows.slice(1);
      const chunkSize = 10; // 10 rows per chunk
      for (let i = 0; i < dataRows.length; i += chunkSize) {
        const chunkRows = dataRows.slice(i, i + chunkSize);
        // Each chunk contains the header and a slice of data rows
        chunks.push([header, ...chunkRows].join('\n'));
      }
    }
  }

  if (chunks.length > 0) {
    const embeddingResponse = await ai.embed({
      content: chunks.map(c => ({text: c})),
    });
    const embeddings = embeddingResponse.map(e => e.embedding);
    documentStore[docId] = { chunks, embeddings };
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function retrieveRelevantChunks(query: string, docId: string): Promise<string> {
    const store = documentStore[docId];
    if (!store) return "";

    const queryEmbeddingResponse = await ai.embed({ content: query });
    const queryEmbedding = queryEmbeddingResponse[0].embedding;
    
    const similarities = store.embeddings.map(chunkEmbedding => 
        cosineSimilarity(queryEmbedding, chunkEmbedding)
    );
    
    const sortedChunks = store.chunks
        .map((chunk, index) => ({ chunk, similarity: similarities[index] }))
        .sort((a, b) => b.similarity - a.similarity);
    
    // Return top 3 most relevant chunks
    return sortedChunks.slice(0, 3).map(c => c.chunk).join('\n\n---\n\n');
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
    
    const lastUserMessage = input.history[input.history.length - 1]?.content || "";
    let documentContext = "";

    // Process and index documents if they exist.
    // The docId is kept simple ("session_pdf", "session_csv") because we only deal with one of each at a time.
    if (input.pdfDataUri) {
      const docId = 'session_pdf';
      // A real implementation would extract text from the PDF data URI.
      // For this example, we'll use a placeholder for the content for demonstration.
      const pdfContent = "Extracted PDF content placeholder. The user uploaded a financial document.";
      await processAndIndexDocument(docId, pdfContent, 'pdf');
      documentContext = await retrieveRelevantChunks(lastUserMessage, docId);
    }
    if (input.csvData) {
      const docId = 'session_csv';
      await processAndIndexDocument(docId, input.csvData, 'csv');
      documentContext = await retrieveRelevantChunks(lastUserMessage, docId);
    }
    
    const messages: MessageData[] = input.history
      .slice(firstUserMessageIndex)
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        content: [{text: message.content}],
      }));
    
    // Add retrieved context to the start of the message history for the AI
    if (documentContext) {
        messages.unshift({
            role: 'user', // Posing as user instruction/context
            content: [{
                text: `Use ONLY the following information to answer the user's question. If the information is not in the context, say that you cannot find the answer in the provided document.\n\nCONTEXT:\n---\n${documentContext}\n---`
            }]
        });
    } else if (input.pdfDataUri) { // Fallback for when RAG might not find chunks, but a PDF is present
        messages.unshift({
          role: 'user',
          content: [
            {
              text: 'The user has ALREADY uploaded the following PDF. I have ALREADY analyzed it and provided a report card. For the rest of the conversation, this document is the primary context. Answer questions based on its content, and if asked to create a chart or graph, use the data from this document.',
            },
            {media: {url: input.pdfDataUri}},
          ],
        });
    } else if (input.csvData) { // Fallback for CSV
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
1.  **Primacy of Retrieved Context:** If the prompt contains a "CONTEXT" block at the beginning, you MUST base your answer solely on the information within that block. If the answer is not in the context, you must explicitly state that the information is not available in the document. Do not use your general knowledge.

2.  **Primacy of Uploaded Documents (without RAG):** The user may have uploaded a PDF (e.g., financial statements) or a CSV (e.g., loan data).
    *   **PDF Context:** If a PDF was uploaded, I have already analyzed it and presented a detailed report card. My subsequent conversation MUST be based on the contents of that PDF. I will act as an expert on that document.
    *   **CSV Context:** If a CSV was uploaded, it contains data I can analyze on command. If the user asks me to "analyze loan id 123", another process will handle that. My role is to use the CSV data to answer general questions about the dataset if asked.
    *   **Both Contexts:** When asked to generate a chart, I will prioritize data from the uploaded document.

3.  **Self-Knowledge (About Page):** If a user asks about your capabilities, features, or how to use the application, your knowledge comes from the "About Abdullah" page. You can direct them there for more details. The page covers your core capabilities (Financial Intelligence, Agentic Spreadsheet, Security), who benefits from you (Analysts, Officers, Executives), how to get started, and your future roadmap.

4.  **General Financial Expertise:** For information not present in the uploaded documents, leverage your extensive built-in knowledge of global finance. You can discuss:
    - General financial regulations and concepts.
    - Principles of financial analysis and risk prediction.
    - Common practices in the banking industry.
    - Answers to any general financial question the user asks.

5.  **When asked about a specific, real-time product from a bank (like from 'sib.om'), state that you don't have live access to their specific, current offerings but can explain what is typical for such products based on your expertise.`;

    const {output} = await ai.generate({
      system: systemPrompt,
      messages: messages,
      output: {
        schema: ChatOutputSchema
      },
    });

    return output!;
  }
);
