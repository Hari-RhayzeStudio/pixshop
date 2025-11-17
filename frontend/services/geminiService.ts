/// <reference types="vite/client" />
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

// Use different API keys for image and text generation models.
// Assumes API_KEY is for image models and GEMINI_TEXT_API_KEY is for text models.
// These should be set in your environment configuration.
const API_KEY_IMAGE = import.meta.env.VITE_GEMINI_IMAGE_API_KEY;
const API_KEY_TEXT = import.meta.env.VITE_GEMINI_TEXT_API_KEY;

// 2. Safety Check: Ensure keys exist before initializing
if (!API_KEY_IMAGE || !API_KEY_TEXT) {
  throw new Error(
    "Missing API Keys! Make sure 'VITE_GEMINI_IMAGE_API_KEY' and 'VITE_GEMINI_TEXT_API_KEY' are set in your .env file."
  );
}

// 3. Initialize the clients
const imageAI = new GoogleGenAI({ apiKey: API_KEY_IMAGE });
const textAI = new GoogleGenAI({ apiKey: API_KEY_TEXT });


const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image for the ${context}. ` + 
        (textFeedback 
            ? `The model responded with text: "${textFeedback}"`
            : "This can happen due to safety filters or if the request is too complex. Please try rephrasing your prompt to be more direct.");

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Starting generative edit at:', hotspot);
    
    const originalImagePart = await fileToPart(originalImage);
    
    // We emphasize the resolution in the prompt as a backup, 
    // but the primary method is sending a square image (see App.tsx changes below).
    const prompt = `You are an expert photo editor AI. Perform a natural, localized edit.
User Request: "${userPrompt}"
Edit Location: Focus on pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}).
Output: Return ONLY the final edited image. High quality.`;
    
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the image model...');
    const response: GenerateContentResponse = await imageAI.models.generateContent({
        model: 'gemini-2.5-flash-image', // Or your working model name
        contents: { parts: [originalImagePart, textPart] },
        // --- REMOVED THE INVALID CONFIG ---
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style.
Filter Request: "${filterPrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Ensure the output is a high-quality 1:1 square image (1024x1024).`;
    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the image model...');
    const response: GenerateContentResponse = await imageAI.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final adjusted image. Ensure the output is a high-quality 1:1 square image (1024x1024).`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the image model...');
    const response: GenerateContentResponse = await imageAI.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};


/**
 * Generates a text description for an image based on a user prompt.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired kind of description.
 * @returns A promise that resolves to the generated text description.
 */
export const generateDescription = async (
    originalImage: File,
    userPrompt: string,
): Promise<string> => {
    console.log(`Starting description generation for prompt: "${userPrompt}"`);
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `You are a creative assistant. Based on the provided image and the user's request, generate a concise and compelling description.
User Request: "${userPrompt}"

Output: Return ONLY the text description. Do not add any extra formatting or introductory phrases.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the text model for description...');
    const response: GenerateContentResponse = await textAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [originalImagePart, textPart] },
    });
    console.log('Received response from model for description.', response);

    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to get the text
    const text = response.text?.trim();
    if (text) {
        return text;
    }

    // 3. If no text, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Description generation stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const errorMessage = `The AI model did not return a text description. This can happen due to safety filters or if the request is unclear. Please try rephrasing your prompt.`;

    console.error(`Model response did not contain text.`, { response });
    throw new Error(errorMessage);
};