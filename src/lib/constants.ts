/**
 * Application-wide constants
 * Centralized configuration for better maintainability
 */

// File Upload Limits (in bytes)
export const FILE_SIZE_LIMITS = {
    PDF: 10 * 1024 * 1024, // 10MB
    CSV: 5 * 1024 * 1024, // 5MB
    XLSX: 5 * 1024 * 1024, // 5MB
    DEFAULT: 10 * 1024 * 1024, // 10MB default
} as const;

// Context/Text Limits (in characters)
export const CONTEXT_LIMITS = {
    /** Max chars of PDF text injected into chat (unpdf extract; avoid aggressive whitespace stripping) */
    CHAT_PDF: 24_000,
    /** Hard cap for entire chat document block (PDF or spreadsheet pack) */
    CHAT_DOCUMENT_MAX: 45_000,
    /** Max CSV chars per sheet inside structured chat context */
    CHAT_TABULAR_CSV_PER_SHEET: 18_000,
    /** Records shown as JSON at start / end of each sheet for precise Q&A */
    CHAT_TABULAR_JSON_FIRST: 25,
    CHAT_TABULAR_JSON_LAST: 12,
    FINANCIAL_STATEMENT: 18_000, // tighter context for speed on serverless
    DASHBOARD: 12_000, // keep prompts small for faster responses
    SPREADSHEET: 16000, // excerpt sent with agentic cells / range analysis
} as const;

// Retry Configuration
export const RETRY_CONFIG = {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY_MS: 1000, // 1 second
    BACKOFF_MULTIPLIER: 2, // Exponential backoff
} as const;

// Request Timeouts (in milliseconds)
const chatTimeoutFromEnv = Number(process.env.LLM_CHAT_TIMEOUT_MS);
const chatLlmMs =
    Number.isFinite(chatTimeoutFromEnv) && chatTimeoutFromEnv >= 5_000 ? chatTimeoutFromEnv : 30_000;

export const TIMEOUTS = {
    LLM_REQUEST: 30_000, // 30 seconds for short LLM flows
    /**
     * Long AI calls: chat (upload + history), financial statement upload analysis, dashboards.
     * Override with LLM_CHAT_TIMEOUT_MS (ms, min 5000).
     */
    LLM_CHAT: chatLlmMs,
    PDF_EXTRACTION: 18_000, // Keep extraction bounded for serverless responsiveness
    FILE_UPLOAD: 25_000, // Free-tier serverless friendly cap
} as const;

// Chat History Configuration
export const CHAT_HISTORY = {
    MAX_MESSAGES: 50, // Keep last 50 messages
    MAX_STORAGE_SIZE: 5 * 1024 * 1024, // 5MB max localStorage size
    STORAGE_KEY: 'banking-chatbot-chat-history',
} as const;

// PDF Generation Configuration
export const PDF_CONFIG = {
    RENDER_DELAY_MS: 500, // Delay before capturing for PDF
    SCALE: 2, // Canvas scale for better quality
    PAGE_FORMAT: 'a4' as const,
    ORIENTATION: 'p' as const, // portrait
} as const;

// Knowledge Base Configuration
export const KNOWLEDGE_BASE = {
    STORAGE_KEY: 'banking-chatbot-knowledge-base',
    MAX_SIZE: 100 * 1024, // 100KB max knowledge base size
} as const;
