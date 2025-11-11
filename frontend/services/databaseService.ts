/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { ImageType } from '../types';

// The backend server URL. In development, this would be localhost.
// In production, this would be your deployed backend's URL.
const API_BASE_URL = 'http://localhost:3001';

/**
 * Updates a product in the database by sending data to the backend API.
 * @param sku The product SKU.
 * @param type The type of image/description ('Wax', 'Cast', 'Final').
 * @param dataType The kind of data being saved ('Image' or 'Description').
 * @param data The actual data, either a File object for an image or a string for a description.
 * @param originalFile The original, unedited file for the current image item.
 * @returns A promise that resolves to the backend's response.
 */
export const updateProductInDB = async (
    sku: string,
    type: ImageType,
    dataType: 'Image' | 'Description',
    data: File | string,
    originalFile: File,
): Promise<{success: boolean, message: string}> => {
    console.log(`API CLIENT: Calling backend to update SKU "${sku}"...`);

    // FormData is used to send files and text fields in a single request.
    const formData = new FormData();
    formData.append('sku', sku);
    formData.append('type', type);
    formData.append('dataType', dataType);

    if (dataType === 'Image' && data instanceof File) {
        // 'image' is the field name the backend (multer) will look for.
        formData.append('image', data, data.name);
        // Also send the original file, backend will use it if type is 'Wax'.
        formData.append('originalImage', originalFile, `original-${originalFile.name}`);

    } else if (dataType === 'Description' && typeof data === 'string') {
        formData.append('description', data);
    } else {
        // This case should not be reached with the current UI logic
        return { success: false, message: 'Invalid data provided for update.' };
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/products/${sku}`, {
            method: 'PATCH',
            body: formData, // No 'Content-Type' header needed, browser sets it for FormData.
        });

        const responseData = await response.json();

        if (!response.ok) {
            // Use the error message from the backend, or a default one.
            throw new Error(responseData.message || `Server responded with status: ${response.status}`);
        }

        return responseData;

    } catch (error) {
        console.error('API CLIENT: Error updating product:', error);
        // Ensure a consistent return type on error.
        const errorMessage = error instanceof Error ? error.message : 'An unknown network error occurred.';
        return { success: false, message: errorMessage };
    }
};