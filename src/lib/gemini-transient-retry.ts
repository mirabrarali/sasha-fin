/**
 * Retry wrapper for transient Google Gemini API failures (503, rate limits).
 */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTransientGeminiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('UNAVAILABLE') ||
    message.includes('503') ||
    message.includes('429') ||
    message.includes('high demand') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('Too Many Requests')
  );
}

export async function withTransientGeminiRetries<T>(
  context: string,
  operation: () => Promise<T>,
  maxAttempts = 4
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (e) {
      if (!isTransientGeminiError(e) || attempt >= maxAttempts) {
        throw e;
      }
      const delayMs = Math.min(10_000, 900 * 2 ** (attempt - 1));
      console.warn(
        `${context}: transient Gemini error (attempt ${attempt}/${maxAttempts}); retrying in ${delayMs}ms — ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      await sleep(delayMs);
    }
  }
  throw new Error(`${context}: exhausted retries without returning`);
}
