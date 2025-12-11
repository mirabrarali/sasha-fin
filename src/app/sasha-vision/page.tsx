
import type { Metadata } from 'next';
import SashaVisionClient from './sasha-vision-client';

export const metadata: Metadata = {
    title: 'Sasha Vision',
    description: 'A creative space to generate and enhance images using Sasha AI. Features include text-to-image and image upscaling.',
    keywords: ['ai image generator', 'image upscaling', 'sasha vision', 'text-to-image', 'ai creative tools'],
};

export default function SashaVisionPage() {
    return <SashaVisionClient />;
}
