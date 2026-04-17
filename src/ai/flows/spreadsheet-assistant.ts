'use server';

import 'server-only';

import Groq from 'groq-sdk';
import { z } from 'zod';

const SpreadsheetMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

const SpreadsheetInputSchema = z.object({
  language: z.enum(['en', 'ar']).default('en'),
  mode: z.enum(['conversation', 'analysis', 'report', 'chart']).default('conversation'),
  userRequest: z.string().min(1).max(8000),
  sheet: z.object({
    name: z.string().max(140).default('Sheet1'),
    columns: z.array(z.string().max(120)).max(120),
    rows: z.array(z.record(z.string(), z.string().max(4000))).max(2000),
  }),
  messages: z.array(SpreadsheetMessageSchema).max(24).default([]),
});

export type SpreadsheetAssistantInput = z.infer<typeof SpreadsheetInputSchema>;

const SpreadsheetEditSchema = z.object({
  rowIndex: z.number().int().min(0),
  colName: z.string(),
  newValue: z.string(),
  reason: z.string().optional(),
});

const SpreadsheetChartSuggestionSchema = z.object({
  type: z.enum(['bar', 'line', 'pie']),
  title: z.string(),
  xKey: z.string(),
  yKey: z.string(),
  note: z.string().optional(),
});

const SpreadsheetAssistantOutputSchema = z.object({
  reply: z.string(),
  reportMarkdown: z.string().optional(),
  edits: z.array(SpreadsheetEditSchema).optional(),
  chartSuggestions: z.array(SpreadsheetChartSuggestionSchema).optional(),
  modelUsed: z.string(),
});

export type SpreadsheetAssistantOutput = z.infer<typeof SpreadsheetAssistantOutputSchema>;

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_SPREADSHEET_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_SPREADSHEET_API_KEY is required for the spreadsheet AI workspace.');
  }
  return new Groq({ apiKey });
}

function pickModel(mode: SpreadsheetAssistantInput['mode']): string {
  const conversationModel = process.env.GROQ_SPREADSHEET_CONVO_MODEL || 'llama-3.1-8b-instant';
  const analyticsModel = process.env.GROQ_SPREADSHEET_ANALYTICS_MODEL || 'llama-3.3-70b-versatile';
  return mode === 'conversation' ? conversationModel : analyticsModel;
}

function compactRows(rows: Array<Record<string, string>>): Array<Record<string, string>> {
  if (rows.length <= 120) return rows;
  const head = rows.slice(0, 80);
  const tail = rows.slice(-30);
  return [
    ...head,
    { _note: `... ${rows.length - head.length - tail.length} rows omitted for prompt budget ...` },
    ...tail,
  ];
}

function buildSystemPrompt(input: SpreadsheetAssistantInput): string {
  const lang = input.language === 'ar' ? 'Arabic' : 'English';
  const mode = input.mode;
  return `You are a senior spreadsheet AI copilot for finance teams.
Language for all prose: ${lang}.
Primary task mode: ${mode}.

Rules:
1) Base every answer ONLY on the provided spreadsheet snapshot and user request.
2) Keep answers practical, concise, and business-ready.
3) If suggesting data edits, produce explicit rowIndex + colName + newValue values.
4) If a requested edit cannot be derived confidently, explain it in reply instead of fabricating values.
5) For chart suggestions, use existing column names in xKey/yKey.
6) Output MUST be strict JSON object with keys:
   - reply (string, required)
   - reportMarkdown (string, optional; include when mode=report)
   - edits (array, optional)
   - chartSuggestions (array, optional)
Do not wrap JSON in markdown fences.`;
}

function buildUserPayload(input: SpreadsheetAssistantInput): string {
  const recentMessages = input.messages.slice(-8);
  const payload = {
    request: input.userRequest,
    mode: input.mode,
    sheet: {
      name: input.sheet.name,
      columns: input.sheet.columns,
      totalRows: input.sheet.rows.length,
      rowsPreview: compactRows(input.sheet.rows),
    },
    conversationContext: recentMessages,
  };
  return JSON.stringify(payload);
}

function parseAssistantOutput(raw: string, modelUsed: string): SpreadsheetAssistantOutput {
  const text = raw.trim();
  const candidate = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text;
  const tryParse = (value: string): SpreadsheetAssistantOutput | null => {
    try {
      const parsed = JSON.parse(value);
      const checked = SpreadsheetAssistantOutputSchema.safeParse({
        ...parsed,
        modelUsed,
      });
      if (checked.success) return checked.data;
    } catch {
      // ignore
    }
    return null;
  };

  const strict = tryParse(candidate);
  if (strict) return strict;

  const normalizedSingleQuoted = candidate
    .replace(/([{,]\s*)'([^']+?)'\s*:/g, '$1"$2":')
    .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_m, group) => `: "${group.replace(/"/g, '\\"')}"`);
  const normalized = tryParse(normalizedSingleQuoted);
  if (normalized) return normalized;

  const replyMatch =
    candidate.match(/["']reply["']\s*:\s*"([\s\S]*?)"\s*(?:,|})/i) ??
    candidate.match(/["']reply["']\s*:\s*'([\s\S]*?)'\s*(?:,|})/i);
  if (replyMatch?.[1]) {
    return {
      reply: replyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim(),
      modelUsed,
    };
  }

  return {
    reply: text || 'I could not generate a structured response. Please try a more specific instruction.',
    modelUsed,
  };
}

export async function spreadsheetAssistant(input: SpreadsheetAssistantInput): Promise<SpreadsheetAssistantOutput> {
  const checked = SpreadsheetInputSchema.parse(input);
  const groq = getGroqClient();
  const model = pickModel(checked.mode);

  const completion = await groq.chat.completions.create({
    model,
    temperature: checked.mode === 'conversation' ? 0.35 : 0.2,
    max_tokens: checked.mode === 'report' ? 2200 : 1400,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt(checked) },
      { role: 'user', content: buildUserPayload(checked) },
    ],
  });

  const content = completion.choices?.[0]?.message?.content ?? '';
  return parseAssistantOutput(content, model);
}

