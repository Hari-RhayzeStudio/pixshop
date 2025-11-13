/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type ImageType = 'Wax' | 'Cast' | 'Final' | 'Wax_alt' | 'Cast_alt' | 'Final_alt';;

export interface ImageState {
  id: string;
  originalFile: File;
  history: File[];
  historyIndex: number;
  description: string | null;
  isDescriptionSaved: boolean;
}