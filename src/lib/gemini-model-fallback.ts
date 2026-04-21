import { isTransientGeminiError } from '@/lib/gemini-transient-retry';

/**
 * When the primary Gemini model is overloaded (503) or briefly unavailable,
 * run the same request again on the fast / lite model without waiting minutes.
 */
export async function withPrimaryThenFastGemini<T>(
  context: string,
  runPrimary: () => Promise<T>,
  runFast: () => Promise<T>,
): Promise<T> {
  try {
    return await runPrimary();
  } catch (e) {
    if (!isTransientGeminiError(e)) throw e;
    const snippet = e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200);
    console.warn(`${context}: primary Gemini transient error; retrying with fast model — ${snippet}`);
    return await runFast();
  }
}
