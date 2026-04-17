/**
 * Retry wrapper for transient Google Gemini API failures (503, rate limits).
 * Free-tier 429 responses often include "Please retry in ~60s" — short exponential
 * backoff burns quota without waiting for the per-minute window.
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

/** True when Google indicates per-minute / free-tier request quota (not a generic 503). */
export function isGeminiFreeTierOrQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('free_tier') ||
    message.includes('quota exceeded') ||
    message.includes('Quota exceeded') ||
    (message.includes('429') && message.includes('quota'))
  );
}

/**
 * Parses suggested wait from Gemini error text (e.g. "Please retry in 58.77s").
 * Returns milliseconds, or null if not present.
 */
export function parseRetryAfterMsFromGoogleError(error: unknown): number | null {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const m1 = message.match(/Please retry in\s+([\d.]+)\s*s\b/i);
  if (m1?.[1]) {
    const sec = parseFloat(m1[1]);
    if (!Number.isNaN(sec) && sec > 0) return Math.round(sec * 1000);
  }
  const m2 = message.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (m2?.[1]) {
    const sec = parseInt(m2[1], 10);
    if (!Number.isNaN(sec) && sec > 0) return sec * 1000;
  }
  return null;
}

function resolveMaxSleepMsCap(override?: number): number {
  if (typeof override === 'number' && override > 0) return override;
  const fromEnv = Number(process.env.GEMINI_RETRY_MAX_SLEEP_MS);
  if (!Number.isNaN(fromEnv) && fromEnv >= 1000) return fromEnv;
  return 4_000;
}

function computeRetryDelayMs(error: unknown, attemptAfterFailure: number, maxSleepMs: number): number {
  const serverHintMs = parseRetryAfterMsFromGoogleError(error);
  if (serverHintMs != null) {
    const withBuffer = serverHintMs + 1_500;
    return Math.min(maxSleepMs, Math.max(2_000, withBuffer));
  }
  if (isGeminiFreeTierOrQuotaError(error)) {
    return Math.min(maxSleepMs, 62_000);
  }
  const exp = Math.min(25_000, 2_000 * 2 ** Math.max(0, attemptAfterFailure - 1));
  return Math.min(maxSleepMs, Math.max(1_500, exp));
}

export type GeminiRetryOptions = {
  maxAttempts?: number;
  /** Upper bound for a single sleep between retries (default from GEMINI_RETRY_MAX_SLEEP_MS or 120s). */
  maxSleepMs?: number;
};

/**
 * Retries the operation when Gemini returns 503 / 429 / UNAVAILABLE / RESOURCE_EXHAUSTED.
 * Honors server "retry in Ns" hints for free-tier RPM limits.
 */
export async function withTransientGeminiRetries<T>(
  context: string,
  operation: () => Promise<T>,
  maxAttemptsOrOpts: number | GeminiRetryOptions = 2
): Promise<T> {
  const opts: GeminiRetryOptions =
    typeof maxAttemptsOrOpts === 'number' ? { maxAttempts: maxAttemptsOrOpts } : maxAttemptsOrOpts;
  const maxAttempts = Math.max(1, opts.maxAttempts ?? 2);
  const maxSleepMs = resolveMaxSleepMsCap(opts.maxSleepMs);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (e) {
      if (!isTransientGeminiError(e) || attempt >= maxAttempts) {
        throw e;
      }
      const delayMs = computeRetryDelayMs(e, attempt, maxSleepMs);
      const delayLabel = delayMs >= 10_000 ? `${(delayMs / 1000).toFixed(1)}s` : `${delayMs}ms`;
      console.warn(
        `${context}: transient Gemini error (attempt ${attempt}/${maxAttempts}); retrying in ${delayLabel} — ${
          e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200)
        }`
      );
      await sleep(delayMs);
    }
  }
  throw new Error(`${context}: exhausted retries without returning`);
}

/** User-visible copy after retries are exhausted (or non-retryable). */
export function getFriendlyGeminiUnavailableMessage(error: unknown): string {
  if (isGeminiFreeTierOrQuotaError(error)) {
    return (
      'Google Gemini rate limit reached. The free tier allows only a few requests per minute per model. ' +
      'Wait about one minute and try again, or enable billing in Google AI Studio for higher limits. ' +
      'See https://ai.google.dev/gemini-api/docs/rate-limits'
    );
  }
  return (
    'Google Gemini is temporarily overloaded (503) or unavailable. Please wait a minute and try again. ' +
    'If this persists, check https://status.cloud.google.com/ and your API plan.'
  );
}
