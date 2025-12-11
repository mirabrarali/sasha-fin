
import type { Metadata } from 'next';
import ChatPageClient from './chat-client';

export const metadata: Metadata = {
  title: 'Chat with Abdullah',
  description: 'Engage in a conversation with Abdullah. Upload financial documents for institutional-grade analysis or have a chat about the market.',
  keywords: ['ai chat', 'financial chat', 'abdullah chat', 'document analysis', 'pdf chat', 'csv chat'],
};

export default function ChatPage() {
  return <ChatPageClient />;
}
