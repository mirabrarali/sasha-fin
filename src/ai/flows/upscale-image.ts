
'use server';

/**
 * @fileOverview A flow for upscaling an image.
 *
 * - upscaleImage - A function that handles the image upscaling.
 * - UpscaleImageInput - The input type for the upscaleImage function.
 * - UpscaleImageOutput - The return type for the upscaleImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const UpscaleImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "An image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type UpscaleImageInput = z.infer<typeof UpscaleImageInputSchema>;

const UpscaleImageOutputSchema = z.object({
  imageUrl: z.string().describe('The upscaled image as a data URI.'),
});
export type UpscaleImageOutput = z.infer<typeof UpscaleImageOutputSchema>;

export async function upscaleImage(input: UpscaleImageInput): Promise<UpscaleImageOutput> {
  return upscaleImageFlow(input);
}

const upscaleImageFlow = ai.defineFlow(
  {
    name: 'upscaleImageFlow',
    inputSchema: UpscaleImageInputSchema,
    outputSchema: UpscaleImageOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: [
            { media: { url: input.imageDataUri } },
            { text: `You are an elite, specialized photo-processing AI engine. Your purpose is to re-render the provided image to a much higher quality, simulating the visual output of a top-tier smartphone camera like the iPhone 16 Pro Max.

**Core Directive:** Your ONLY task is to perform a jaw-dropping technical enhancement of the image. You must NOT change the subject, the background, the composition, the pose, the objects, or the overall artistic intent of the original photo.

**Enhancement Checklist:**
1.  **Preserve Identity:** The content of the image is sacred. A woman looking left must remain the exact same woman looking left. Do not alter anything.
2.  **Remove Imperfections:** Eliminate all blurriness, compression artifacts, and digital noise.
3.  **Boost Clarity & Sharpness:** Dramatically increase the sharpness and detail to create an ultra-clear, high-pixel-count final image.
4.  **Enhance Visuals:** Improve the color depth, dynamic range, and lighting to be vibrant and true-to-life, as if processed by advanced computational photography algorithms.
5.  **Polished Output:** The final image should look polished, professional, and visually stunning, without looking artificial.

Execute this enhancement on the provided image now.` },
        ],
        config: {
            responseModalities: ['TEXT', 'IMAGE'],
        },
    });

    if (!media.url) {
        throw new Error('Image upscaling failed to produce an image.');
    }

    return { imageUrl: media.url };
  }
);
