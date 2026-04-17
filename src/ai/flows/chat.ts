'use server';

/**
 * @fileOverview Conversational AI Chat using Genkit + Gemini
 */

import { ai, defaultRetryMiddleware, fastModel } from '@/ai/genkit';
import { buildDocumentContextForChat } from '@/lib/document-chat-context';
import { z } from 'genkit';
import { getKnowledge } from '@/actions/knowledge-base-actions';
import { loanDataCsv } from '@/data/loan_data';
import { RETRY_CONFIG, TIMEOUTS } from '@/lib/constants';
import { withLLMTimeout } from '@/lib/timeout-utils';

const CHAT_HISTORY_MAX_MESSAGES = 14;
const CHAT_HISTORY_CHAR_BUDGET = 9_000;
const CHAT_CONTEXT_CHAR_BUDGET = 12_000;
const CHAT_KNOWLEDGE_CHAR_BUDGET = 3_000;
const CHAT_FALLBACK_DATA_CHAR_BUDGET = 8_000;
const CHAT_TIMEOUT_MS = Math.min(TIMEOUTS.LLM_CHAT, 45_000);

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
    .describe('An uploaded document (PDF, spreadsheets, CSV/TSV, JSON, text, etc.) as a data URI for chat context.'),
  language: z
    .enum(['en', 'ar'])
    .default('en')
    .describe('The language for the response, either English (en) or Arabic (ar).'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChartDataSchema = z.object({
  labels: z.array(z.string()).describe('The labels for the chart axes or segments.'),
  datasets: z
    .array(
      z.object({
        label: z.string().describe('The label for the dataset.'),
        data: z.array(z.number()).describe('The numerical data for the dataset.'),
      })
    )
    .describe('The datasets to be plotted.'),
});

const ChatOutputSchema = z.object({
  content: z.string().describe("The chatbot's response to the user."),
  chart: z
    .object({
      type: z.enum(['bar', 'pie']).describe("The type of chart to generate."),
      title: z.string().describe('The title of the chart.'),
      data: ChartDataSchema.describe('The data for the chart, formatted for a chart library like Recharts.'),
    })
    .optional()
    .describe('Optional chart to display when the user asks for a visualization.'),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

function sanitizeDisplayedChatContent(raw: string): string {
  const s = raw.trim();
  if (!s) return raw;

  const wholeFence = s.match(/^```(?:json)?\s*([\s\S]*?)```$/im);
  if (wholeFence?.[1]) {
    try {
      const data = JSON.parse(wholeFence[1].trim()) as unknown;
      const checked = ChatOutputSchema.safeParse(data);
      if (checked.success && checked.data.content.trim()) return checked.data.content.trim();
    } catch {
      // ignore
    }
  }

  if (s.startsWith('{') && /"content"\s*:/.test(s)) {
    try {
      const data = JSON.parse(s) as unknown;
      const checked = ChatOutputSchema.safeParse(data);
      if (checked.success && checked.data.content.trim()) return checked.data.content.trim();
    } catch {
      // ignore
    }
  }
  return s;
}

function withSanitizedContent(out: ChatOutput): ChatOutput {
  const content = sanitizeDisplayedChatContent(out.content);
  return content === out.content ? out : { ...out, content };
}

function compactText(input: string, maxChars: number): string {
  const text = input.trim();
  if (text.length <= maxChars) return text;
  const head = text.slice(0, Math.floor(maxChars * 0.78));
  const tail = text.slice(-Math.floor(maxChars * 0.18));
  return `${head}\n...[content truncated for speed/context budget]...\n${tail}`;
}

function compactHistory(history: ChatInput['history']): ChatInput['history'] {
  const latest = history.slice(-CHAT_HISTORY_MAX_MESSAGES);
  let used = 0;
  const out: ChatInput['history'] = [];
  for (let i = latest.length - 1; i >= 0; i--) {
    const msg = latest[i]!;
    const content = compactText(msg.content, 1_200);
    if (used + content.length > CHAT_HISTORY_CHAR_BUDGET && out.length > 0) break;
    out.unshift({ role: msg.role, content });
    used += content.length;
  }
  return out;
}

function shouldIncludeDocumentContext(latestUserMessage: string): boolean {
  const q = latestUserMessage.toLowerCase();
  if (!q.trim()) return false;
  if (q.length < 18 && /(hi|hello|hey|thanks|ok|okay|yo|مرحبا|السلام|شكرا)/i.test(q)) return false;
  return /(analy|summary|report|chart|graph|table|data|csv|excel|pdf|row|column|account|loan|balance|revenue|income|profit|risk|credit|\d)/i.test(
    q
  );
}

function isRateLimitOrQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('quota') ||
    message.includes('rate') ||
    message.includes('429') ||
    message.includes('token')
  );
}

function isRequestTooLargeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.includes('Request too large') || message.includes('413') || message.includes('context length');
}

function quotaFriendlyMessage(language: ChatInput['language']): string {
  if (language === 'ar') {
    return 'تم تجاوز حد استخدام الذكاء الاصطناعي حالياً. يرجى المحاولة لاحقاً أو تقليل حجم الطلب.';
  }
  return 'AI quota is currently exhausted. Please try again later or reduce request size.';
}

function buildConversationText(history: ChatInput['history']): string {
  return history.map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`).join('\n\n');
}

function resolveChatOutputFromText(rawResponse: string): ChatOutput {
  const text = rawResponse.trim();
  if (!text) throw new Error('Empty model response');

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

async function runChat(input: ChatInput): Promise<ChatOutput> {
  try {
    const compactedHistory = compactHistory(input.history);
    const firstUserMessageIndex = compactedHistory.findIndex((m) => m.role === 'user');
    if (firstUserMessageIndex === -1) {
      return { content: "I'm here to help. How can I assist with your banking needs?" };
    }

    const historyFromFirstUser = compactedHistory.slice(firstUserMessageIndex);
    let contextText = '';
    const latestUserMessage = [...compactedHistory].reverse().find((m) => m.role === 'user')?.content ?? '';
    const includeDocContext = shouldIncludeDocumentContext(latestUserMessage);

    if (input.pdfDataUri && includeDocContext) {
      try {
        console.log('Building uploaded document context for chat (structured spreadsheet or PDF text)...');
        const documentBlock = await buildDocumentContextForChat(input.pdfDataUri);
        contextText = `The user has already uploaded a financial document. Use it as primary context.\n\nDocument content:\n${compactText(documentBlock, CHAT_CONTEXT_CHAR_BUDGET)}`;
      } catch (error) {
        console.error('Failed to extract uploaded file for chat context:', error);
        contextText = 'A document was uploaded but could not be processed. Ask the user to re-upload a valid PDF, CSV, or XLSX file.';
      }
    } else if (input.pdfDataUri) {
      contextText = 'A financial document was uploaded previously. Use it only for document-specific questions; otherwise reply concisely.';
    } else {
      contextText = `The user has access to this customer account CSV sample:\n\`\`\`csv\n${compactText(
        loanDataCsv,
        CHAT_FALLBACK_DATA_CHAR_BUDGET
      )}\n\`\`\``;
    }

    const knowledgeBase = compactText(await getKnowledge(), CHAT_KNOWLEDGE_CHAR_BUDGET);
    const conversationText = buildConversationText(historyFromFirstUser);
    const systemPrompt = `You are Banking Chatbot for finance users.

Rules:
- Reply only in ${input.language === 'ar' ? 'Arabic' : 'English'}.
- Keep answers concise, accurate, and practical.
- The visible "content" must be natural prose only (no JSON or code fences).
- If user asks for a chart/graph/visualization and data exists, include one chart object.
- Chart type must be "bar" or "pie" only.
- For every dataset, data[] length must equal labels[] length (same index = same category).

Knowledge base (highest priority):
${knowledgeBase || 'No custom instructions provided.'}

Context:
${contextText}

Conversation:
${conversationText}`;

    let lastError: Error | null = null;
    const maxRetries = Math.min(RETRY_CONFIG.MAX_ATTEMPTS, 1);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Chat attempt ${attempt}...`);
        const response = await withLLMTimeout(
          ai.generate({
            model: fastModel({ temperature: 0.25, maxOutputTokens: 900 }),
            use: [defaultRetryMiddleware],
            prompt: systemPrompt,
            output: { schema: ChatOutputSchema },
          }),
          CHAT_TIMEOUT_MS
        );

        if (response.output?.content?.trim()) {
          console.log('Chat completed successfully');
          return withSanitizedContent(response.output);
        }

        const fallback = resolveChatOutputFromText(response.text ?? '');
        if (fallback.content.trim()) {
          console.log('Chat completed successfully');
          return fallback;
        }
        throw new Error('Invalid response from AI model');
      } catch (error) {
        lastError = error as Error;
        console.error(`Chat attempt ${attempt} failed:`, error);
        if (isRateLimitOrQuotaError(error)) {
          return { content: quotaFriendlyMessage(input.language) };
        }
        if (isRequestTooLargeError(error)) {
          return {
            content:
              input.language === 'ar'
                ? 'حجم الطلب كبير جداً للموديل الحالي. جرّب رسالة أقصر أو ملفاً أصغر.'
                : 'This request is too large for the current model limits. Try a shorter question or a smaller document.',
          };
        }
        if (attempt < maxRetries) {
          const delayMs =
            RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    console.error('All chat attempts failed:', lastError);
    return {
      content:
        input.language === 'ar'
          ? 'عذراً، واجهت مشكلة مؤقتة في الاتصال بخدمة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.'
          : 'I apologize, but I encountered a temporary issue connecting to the AI service. Please try again in a moment.',
    };
  } catch (error) {
    console.error('Chat error:', error);
    throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  runChat
);

export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}
