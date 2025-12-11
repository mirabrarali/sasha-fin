
'use server';

/**
 * @fileOverview A flow for generating images from a text prompt using Genkit.
 *
 * - generateImageFromText - A function that handles the image generation.
 * - GenerateImageInput - The input type for the generateImageFrom-text function.
 * - GenerateImageOutput - The return type for the generateImageFrom-text function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('The text prompt to generate an image from.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().describe('The generated image as a data URI.'),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImageFromText(input: GenerateImageInput): Promise<GenerateImageOutput> {
  return generateImageFlow(input);
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: `You are a world-class AI art director with a mastery of photographic and cinematic styles. Your task is to interpret a user's prompt and transform it into a breathtaking, photorealistic masterpiece.

**Core Directive:** Generate an image that is ultra-detailed, with sharp focus, and appears as if it were shot on a high-end DSLR camera with a f/1.8 aperture. The final image should be a masterpiece of photorealism with cinematic lighting and professional color grading, suitable for a high-fashion magazine cover. Always aim for an 8k UHD final output in a 9:16 portrait aspect ratio.

**User's core request:** "${input.prompt}"

Now, apply your full creative and technical expertise to generate the image.`,
        config: {
            responseModalities: ['TEXT', 'IMAGE'],
            safetySettings: [
                {
                    category: 'HARM_CATEGORY_HATE_SPEECH',
                    threshold: 'BLOCK_ONLY_HIGH',
                },
                {
                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
                },
            ]
        },
    });

    if (!media.url) {
        throw new Error('Image generation failed to produce an image.');
    }

    return { imageUrl: media.url };
  }
);
