/**
 * LocalStorage utilities with size management and error handling
 */

import { CHAT_HISTORY } from './constants';
import type { Message } from '@/components/chat/message-list';

/**
 * Estimates the size of a message in bytes
 */
function estimateMessageSize(message: Message): number {
    const jsonString = JSON.stringify(message);
    // Each character in UTF-8 is approximately 1-4 bytes, we'll use 2 as average
    return new Blob([jsonString]).size;
}

/**
 * Estimates total size of messages array
 */
function estimateMessagesSize(messages: Message[]): number {
    return messages.reduce((total, msg) => total + estimateMessageSize(msg), 0);
}

/**
 * Truncates messages array to fit within size limit
 * Keeps the most recent messages
 */
function truncateMessages(messages: Message[], maxSize: number): Message[] {
    if (messages.length === 0) return messages;

    // Start from the end and work backwards
    const result: Message[] = [];
    let totalSize = 0;

    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const msgSize = estimateMessageSize(msg);

        if (totalSize + msgSize > maxSize) {
            break;
        }

        result.unshift(msg);
        totalSize += msgSize;
    }

    return result;
}

/**
 * Saves messages to localStorage with size management
 * Limits both message count and total size
 */
export function saveChatHistory(messages: Message[]): { success: boolean; error?: string } {
    try {
        // Limit message count first
        let messagesToSave = messages;
        if (messagesToSave.length > CHAT_HISTORY.MAX_MESSAGES) {
            // Keep the most recent messages
            messagesToSave = messagesToSave.slice(-CHAT_HISTORY.MAX_MESSAGES);
        }

        // Limit by size
        const estimatedSize = estimateMessagesSize(messagesToSave);
        if (estimatedSize > CHAT_HISTORY.MAX_STORAGE_SIZE) {
            messagesToSave = truncateMessages(messagesToSave, CHAT_HISTORY.MAX_STORAGE_SIZE);
        }

        const jsonString = JSON.stringify(messagesToSave);
        const sizeInBytes = new Blob([jsonString]).size;

        // Final size check before saving
        if (sizeInBytes > CHAT_HISTORY.MAX_STORAGE_SIZE) {
            // If still too large, keep only the last 10 messages
            messagesToSave = messagesToSave.slice(-10);
        }

        localStorage.setItem(CHAT_HISTORY.STORAGE_KEY, JSON.stringify(messagesToSave));
        return { success: true };
    } catch (error) {
        const err = error as Error;
        
        // Handle quota exceeded error
        if (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            // Try to save with fewer messages
            try {
                const reducedMessages = messages.slice(-10);
                localStorage.setItem(CHAT_HISTORY.STORAGE_KEY, JSON.stringify(reducedMessages));
                return { 
                    success: true, 
                    error: 'Storage quota exceeded. Only last 10 messages saved.' 
                };
            } catch {
                return { 
                    success: false, 
                    error: 'Storage quota exceeded. Unable to save chat history.' 
                };
            }
        }

        return { 
            success: false, 
            error: `Failed to save: ${err.message || 'Unknown error'}` 
        };
    }
}

/**
 * Loads messages from localStorage
 */
export function loadChatHistory(): Message[] | null {
    try {
        const saved = localStorage.getItem(CHAT_HISTORY.STORAGE_KEY);
        if (!saved) return null;

        const messages = JSON.parse(saved) as Message[];
        
        // Validate it's an array
        if (!Array.isArray(messages)) {
            return null;
        }

        return messages;
    } catch (error) {
        console.error('Failed to load chat history:', error);
        return null;
    }
}

/**
 * Clears chat history from localStorage
 */
export function clearChatHistory(): void {
    try {
        localStorage.removeItem(CHAT_HISTORY.STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear chat history:', error);
    }
}

/**
 * Gets the current storage usage for chat history
 */
export function getChatHistorySize(): { used: number; limit: number; percentage: number } {
    try {
        const saved = localStorage.getItem(CHAT_HISTORY.STORAGE_KEY);
        if (!saved) {
            return { used: 0, limit: CHAT_HISTORY.MAX_STORAGE_SIZE, percentage: 0 };
        }

        const sizeInBytes = new Blob([saved]).size;
        const percentage = (sizeInBytes / CHAT_HISTORY.MAX_STORAGE_SIZE) * 100;

        return {
            used: sizeInBytes,
            limit: CHAT_HISTORY.MAX_STORAGE_SIZE,
            percentage: Math.min(percentage, 100),
        };
    } catch {
        return { used: 0, limit: CHAT_HISTORY.MAX_STORAGE_SIZE, percentage: 0 };
    }
}
