/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// import { ImageType } from '../types'; 
import { ProductSummary } from '../types';

// The backend server URL.
// const API_BASE_URL = 'http://localhost:3001';
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export const fetchProductList = async (): Promise<ProductSummary[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        if (!response.ok) {
            throw new Error("Failed to fetch product list");
        }
        return await response.json();
    } catch (error) {
        console.error("API: Error fetching products", error);
        return [];
    }
};


export const updateProductInDB = async (
    sku: string,
    type: string,
    dataType: 'Image' | 'Description',
    data: File | string,
    originalFile: File,
): Promise<{success: boolean, message: string}> => {
    console.log(`API CLIENT: Calling backend to update SKU "${sku}"...`);

    const formData = new FormData();
    formData.append('sku', sku);
    formData.append('type', type);
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