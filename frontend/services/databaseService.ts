/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- [CHANGED] We no longer import ImageType, as 'type' is more generic ---
// import { ImageType } from '../types'; 

// The backend server URL.
const API_BASE_URL = 'http://localhost:3001';

/**
 * Updates a product in the database by sending data to the backend API.
 * @param sku The product SKU.
 * @param type The type of data ('Wax', 'Cast', 'Final', 'Wax_alt', 'Cast_alt', 'Final_alt').
 * @param dataType The kind of data being saved ('Image' or 'Description').
 * @param data The actual data, either a File object or a string.
 * @param originalFile The original, unedited file for the current image item.
 * @returns A promise that resolves to the backend's response.
 */
export const updateProductInDB = async (
    sku: string,
    // --- [CHANGED] This is now a generic string to allow "Wax_alt", etc. ---
    type: string,
    dataType: 'Image' | 'Description',
    data: File | string,
    originalFile: File,
): Promise<{success: boolean, message: string}> => {
    console.log(`API CLIENT: Calling backend to update SKU "${sku}"...`);

    const formData = new FormData();
    formData.append('sku', sku);
    formData.append('type', type); // 'type' is now 'Wax', 'Wax_alt', etc.
    formData.append('dataType', dataType);

    if (dataType === 'Image' && data instanceof File) {
        formData.append('image', data, data.name);
        formData.append('originalImage', originalFile, `original-${originalFile.name}`);

    } else if (dataType === 'Description' && typeof data === 'string') {
        formData.append('description', data);
    } else {
        return { success: false, message: 'Invalid data provided for update.' };
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/products/${sku}`, {
            method: 'PATCH',
            body: formData, 
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || `Server responded with status: ${response.status}`);
        }

        return responseData;

    } catch (error) {
        console.error('API CLIENT: Error updating product:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown network error occurred.';
        return { success: false, message: errorMessage };
    }
};