/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type ImageType = 'Pre' | 'Sketch' | 'Wax' | 'Cast' | 'Final';

export type DescriptionTab = 'Description' | 'Alt Description' | 'Meta Description';

export type DescriptionType = 
    // Added Sketch description types
    | 'Sketch_description' | 'Wax_description' | 'Cast_description' | 'Final_description'
    | 'Sketch_alt' | 'Wax_alt' | 'Cast_alt' | 'Final_alt'
    | 'Meta_title' | 'Meta_description' | 'Product_name';

export type ProductStatus = 'empty' | 'partial' | 'full';

export interface ProductSummary {
    sku: string;
    category: string;
    meta_title: string | null;
    statusColor: 'green' | 'orange' | 'normal';
}

export interface ImageState {
  id: string;
  originalFile: File;
  history: File[];
  historyIndex: number;
  description: string | null;
  isDescriptionSaved: boolean;
  assignedSku?: string;
}