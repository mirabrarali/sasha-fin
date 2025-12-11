
'use server';

import { promises as fs } from 'fs';
import path from 'path';

// On Vercel, use the /tmp directory which is writable.
// In local development, we still use the /tmp directory to ensure consistent behavior.
const storagePath = path.join('/tmp', 'knowledge-base.json');

type KnowledgeBase = {
    notes: string;
};

const defaultNotes = `Your custom notes, rules, and commands for Abdullah will be stored here. Abdullah will always read this file before responding to you in the main chat. 

For example:
- Never suggest investing in cryptocurrency.
- When I ask for a market summary, always include the VIX index.
- My company's fiscal year ends in June.`;

async function ensureFileExists() {
    try {
        await fs.access(storagePath);
    } catch {
        // The file or directory doesn't exist. Create it.
        const dir = path.dirname(storagePath);
        
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            // Ignore error if directory already exists (race condition)
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
                throw error;
            }
        }

        // Seed the file with default content.
        const initialContent = JSON.stringify({ notes: defaultNotes }, null, 2);
        await fs.writeFile(storagePath, initialContent, 'utf-8');
    }
}

export async function getKnowledge(): Promise<string> {
    await ensureFileExists();
    try {
        const fileContent = await fs.readFile(storagePath, 'utf-8');
        const data: KnowledgeBase = JSON.parse(fileContent);
        // If for any reason the file is empty or corrupted, return default notes
        return data.notes || defaultNotes;
    } catch (error) {
        console.error('Failed to read knowledge base, returning default:', error);
        // Return a default string in case of a read error.
        return defaultNotes;
    }
}

export async function saveKnowledge(notes: string): Promise<{ success: boolean }> {
    await ensureFileExists();
    try {
        const data: KnowledgeBase = { notes };
        await fs.writeFile(storagePath, JSON.stringify(data, null, 2), 'utf-8');
        return { success: true };
    } catch (error) {
        console.error('Failed to save knowledge base:', error);
        return { success: false };
    }
}
