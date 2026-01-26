
import type { Metadata } from 'next';
import KnowledgeBaseClient from './knowledge-base-client';

export const metadata: Metadata = {
    title: 'Chatbot Knowledge Base',
    description: "Customize the chatbot's knowledge. Add your own instructions, rules, and data for it to remember across all conversations.",
    keywords: ['banking chatbot knowledge base', 'custom instructions', 'ai personalization', 'financial rules', 'chatbot settings'],
};

export default function KnowledgeBasePage() {
    return <KnowledgeBaseClient />;
}
