/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type ImageType = 'Wax' | 'Cast' | 'Final';

export interface ImageState {
  id: string;
  originalFile: File;
  history: File[];
  historyIndex: number;
  description: string | null;
  isDescriptionSaved: boolean;
}