
import type { Metadata } from 'next';
import AbdullahVisionClient from './abdullah-vision-client';

export const metadata: Metadata = {
    title: 'Abdullah Vision',
    description: 'A creative space to generate and enhance images using Abdullah AI. Features include text-to-image and image upscaling.',
    keywords: ['ai image generator', 'image upscaling', 'abdullah vision', 'text-to-image', 'ai creative tools'],
};

export default function AbdullahVisionPage() {
    return <AbdullahVisionClient />;
}
