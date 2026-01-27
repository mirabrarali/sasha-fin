/**
 * Timeout utilities for async operations
 */

import { TIMEOUTS } from './constants';

/**
 * Creates a promise that rejects after the specified timeout
 */
function createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });
}

/**
 * Wraps a promise with a timeout
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Custom error message
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = TIMEOUTS.LLM_REQUEST,
    errorMessage?: string
): Promise<T> {
    return Promise.race([
        promise,
        createTimeoutPromise(timeoutMs).then(() => {
            throw new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`);
        }),
    ]);
}

/**
 * Wraps an LLM invocation with timeout
 */
export async function withLLMTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = TIMEOUTS.LLM_REQUEST
): Promise<T> {
    return withTimeout(
        promise,
        timeoutMs,
        `LLM request timed out after ${timeoutMs / 1000} seconds. Please try again.`
    );
}

/**
 * Wraps a file operation with timeout
 */
export async function withFileOperationTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = TIMEOUTS.FILE_UPLOAD
): Promise<T> {
    return withTimeout(
        promise,
        timeoutMs,
        `File operation timed out after ${timeoutMs / 1000} seconds.`
    );
}
