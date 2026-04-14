import { StructuredOutputParser } from '@langchain/core/output_parsers';

/** Normalize LangChain message `content` (string or multimodal parts) for parsing. */
export function toLlmText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text: unknown }).text);
        }
        return '';
      })
      .join('');
  }
  return content == null ? '' : String(content);
}

/**
 * `StructuredOutputParser.fromZodSchema(zodSchema)` makes TS recurse very deeply on `next build`.
 * Cast the factory so the schema is only `unknown` at the call site.
 */
export type LooseStructuredParser = {
  parse(text: string): Promise<unknown>;
  getFormatInstructions(): string;
};

/** `.bind` fixes Vercel/runtime `TypeError: this is not a constructor` when the method is referenced unbound. */
export const structuredParserFromZod = StructuredOutputParser.fromZodSchema.bind(
  StructuredOutputParser
) as (schema: unknown) => LooseStructuredParser;
