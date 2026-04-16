import type { Metadata } from 'next';
import ChatPageClient from './chat-client';

/** Allow long AI calls when chat includes large document context. */
export const maxDuration = 120;

export const metadata: Metadata = {
  title: 'Chat with Banking Chatbot',
  description: 'Engage in a conversation with the Banking Chatbot. Upload financial documents for institutional-grade analysis or have a chat about the market.',
  keywords: ['ai chat', 'financial chat', 'banking chatbot', 'document analysis', 'pdf chat', 'csv chat'],
};

export default function ChatPage() {
  return <ChatPageClient />;
}
