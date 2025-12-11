
import type { Metadata } from 'next';
import AboutPageClient from './about-client';

export const metadata: Metadata = {
  title: 'About Abdullah',
  description: 'Learn about Abdullah, the AI-powered financial strategist. Discover his core capabilities, who benefits, and how to get started.',
  keywords: ['ai banking', 'financial strategist', 'abdullah', 'agentic ai', 'financial services', 'fintech', 'about abdullah'],
};

export default function AboutPage() {
  return <AboutPageClient />;
}
