
import type { Metadata } from 'next';
import KnowledgeBaseClient from './knowledge-base-client';

export const metadata: Metadata = {
    title: 'Abdullah\'s Knowledge Base',
    description: 'Customize Abdullah\'s knowledge. Add your own instructions, rules, and data for him to remember across all conversations.',
    keywords: ['abdullah knowledge base', 'custom instructions', 'ai personalization', 'financial rules', 'abdullah settings'],
};

export default function KnowledgeBasePage() {
    return <KnowledgeBaseClient />;
}
