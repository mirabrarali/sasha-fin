import { isTransientGeminiError } from '@/lib/gemini-transient-retry';

/** Primary call failed in a way where the lite model may still succeed (overload, timeout, etc.). */
function shouldRetryWithFastGemini(error: unknown): boolean {
  if (isTransientGeminiError(error)) return true;
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    /timed out|timeout|AbortError|ETIMEDOUT|ECONNRESET|socket hang up/i.test(message) ||
    message.includes('DEADLINE_EXCEEDED')
  );
}

/**
 * When the primary Gemini model is overloaded (503), briefly unavailable, or the
 * request hits our per-call timeout, run the same request again on the fast / lite model.
 */
export async function withPrimaryThenFastGemini<T>(
  context: string,
  runPrimary: () => Promise<T>,
  runFast: () => Promise<T>,
): Promise<T> {
  try {
    return await runPrimary();
  } catch (e) {
    if (!shouldRetryWithFastGemini(e)) throw e;
    const snippet = e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200);
    console.warn(`${context}: primary Gemini failed; retrying with fast model — ${snippet}`);
    return await runFast();
  }
}
