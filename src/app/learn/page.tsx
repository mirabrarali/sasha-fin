
import type { Metadata } from 'next';
import LearnPageClient from './learn-client';

export const metadata: Metadata = {
  title: 'About The Banking Chatbot',
  description: 'Learn about the AI-powered financial strategist. Discover its core capabilities, who benefits, and how to get started.',
  keywords: ['ai banking', 'financial strategist', 'banking chatbot', 'agentic ai', 'financial services', 'fintech', 'about chatbot'],
};

export default function LearnPage() {
  return <LearnPageClient />;
}
