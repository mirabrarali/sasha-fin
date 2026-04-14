
import type { Metadata } from 'next';
import AboutPageClient from './about-client';

export const metadata: Metadata = {
  title: 'About — Banking Chatbot',
  description:
    'Executive overview of Banking Chatbot for banks: chat workspace, data analytics, spreadsheet intelligence, secure deployment, and presentation mode.',
  keywords: [
    'banking chatbot',
    'bank operations',
    'financial document analysis',
    'data analytics',
    'spreadsheet',
    'on-premises',
    'enterprise banking',
  ],
};

export default function AboutPage() {
  return <AboutPageClient />;
}
