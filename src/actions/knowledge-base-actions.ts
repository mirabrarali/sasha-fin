
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { KNOWLEDGE_BASE } from '@/lib/constants';

type KnowledgeBase = {
    notes: string;
};

const defaultNotes = `Your custom notes, rules, and commands for the chatbot will be stored here. The chatbot will always read this file before responding to you in the main chat. 

For example:
- Never suggest investing in cryptocurrency.
- When I ask for a market summary, always include the VIX index.
- My company's fiscal year ends in June.`;

/**
 * Get storage path for knowledge base
 * Uses /tmp for serverless environments (Vercel, AWS Lambda)
 * Falls back to process.cwd()/tmp for local development if /tmp is not available
 */
function getStoragePath(): string {
    // Try /tmp first (works on Vercel and most serverless platforms)
    const tmpPath = path.join('/tmp', 'knowledge-base.json');
    
    // For local development, check if /tmp exists, otherwise use project tmp
    try {
        // This will throw if /tmp doesn't exist or isn't writable
        return tmpPath;
    } catch {
        // Fallback to project-relative tmp directory
        return path.join(process.cwd(), 'tmp', 'knowledge-base.json');
    }
}

/**
 * Ensures the knowledge base file exists with default content
 * Handles both serverless and local environments
 */
async function ensureFileExists(): Promise<string> {
    const storagePath = getStoragePath();
    
    try {
        await fs.access(storagePath);
        return storagePath;
    } catch {
        // The file or directory doesn't exist. Create it.
        const dir = path.dirname(storagePath);
        
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            // Ignore error if directory already exists (race condition)
            const err = error as NodeJS.ErrnoException;
            if (err.code !== 'EEXIST' && err.code !== 'EACCES') {
                console.warn('Could not create knowledge base directory:', err.message);
                // Continue anyway - might work if parent directory exists
            }
        }

        try {
            // Seed the file with default content.
            const initialContent = JSON.stringify({ notes: defaultNotes }, null, 2);
            await fs.writeFile(storagePath, initialContent, 'utf-8');
        } catch (writeError) {
            console.warn('Could not write knowledge base file:', writeError);
            // Return path anyway - might be read-only, but we'll try
        }
        
        return storagePath;
    }
}

/**
 * Retrieves the knowledge base content
 * Returns default notes if file cannot be read (e.g., in serverless with no persistence)
 */
export async function getKnowledge(): Promise<string> {
    try {
        const storagePath = await ensureFileExists();
        const fileContent = await fs.readFile(storagePath, 'utf-8');
        const data: KnowledgeBase = JSON.parse(fileContent);
        
        // Validate size
        if (data.notes && data.notes.length > KNOWLEDGE_BASE.MAX_SIZE) {
            console.warn('Knowledge base exceeds max size, truncating');
            return data.notes.slice(0, KNOWLEDGE_BASE.MAX_SIZE);
        }
        
        return data.notes || defaultNotes;
    } catch (error) {
        // In serverless environments, /tmp might be cleared between invocations
        // This is expected behavior - return default notes
        const err = error as NodeJS.ErrnoException;
        if (err.code === 'ENOENT' || err.code === 'EACCES') {
            console.info('Knowledge base file not accessible, using defaults (this is normal in serverless)');
        } else {
            console.error('Failed to read knowledge base:', error);
        }
        return defaultNotes;
    }
}

/**
 * Saves knowledge base content
 * Note: In serverless environments (Vercel), /tmp is ephemeral and will be cleared
 * between function invocations. For persistent storage, consider using:
 * - Vercel KV (Redis)
 * - Vercel Postgres
 * - External database
 */
export async function saveKnowledge(notes: string): Promise<{ success: boolean; message?: string }> {
    // Validate size
    if (notes.length > KNOWLEDGE_BASE.MAX_SIZE) {
        return {
            success: false,
            message: `Knowledge base exceeds maximum size of ${KNOWLEDGE_BASE.MAX_SIZE} bytes`,
        };
    }

    try {
        const storagePath = await ensureFileExists();
        const data: KnowledgeBase = { notes };
        await fs.writeFile(storagePath, JSON.stringify(data, null, 2), 'utf-8');
        return { success: true };
    } catch (error) {
        const err = error as NodeJS.ErrnoException;
        console.error('Failed to save knowledge base:', error);
        
        // Provide helpful error message
        if (err.code === 'EACCES' || err.code === 'EROFS') {
            return {
                success: false,
                message: 'Cannot save: storage is read-only. In serverless environments, consider using a database.',
            };
        }
        
        return {
            success: false,
            message: `Failed to save: ${err.message || 'Unknown error'}`,
        };
    }
}
