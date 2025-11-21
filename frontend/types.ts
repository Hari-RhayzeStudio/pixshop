/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type ImageType = 'Pre' | 'Wax' | 'Cast' | 'Final';

// The tabs available in the Description Panel
export type DescriptionTab = 'Description' | 'Alt Description' | 'Meta Description';

// The specific targets where text can be saved in the DB
export type DescriptionType = 
    | 'Wax_description' | 'Cast_description' | 'Final_description'
    | 'Wax_alt' | 'Cast_alt' | 'Final_alt'
    | 'Meta_title' | 'Meta_description' | 'Product_name';

export interface ImageState {
  id: string;
  originalFile: File;
  history: File[];
  historyIndex: number;
  description: string | null;
  isDescriptionSaved: boolean;
}