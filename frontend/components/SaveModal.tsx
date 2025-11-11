/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { ImageType } from '../types';

interface SaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    // --- [FIX 1] SKU is now a string (Varchar) ---
    onSave: (sku: string, type: ImageType) => void; 
    itemType: 'Image' | 'Description';
    isSaving: boolean;
}

const SaveModal: React.FC<SaveModalProps> = ({ isOpen, onClose, onSave, itemType, isSaving }) => {
    const [sku, setSku] = useState('');
    const [type, setType] = useState<ImageType>('Wax');

    useEffect(() => {
        if (isOpen) {
            setSku('');
            setType('Wax');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (sku.trim() && type) {
            // This now correctly sends a string
            onSave(sku.trim(), type); 
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 shadow-2xl w-full max-w-md flex flex-col gap-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-100">Save {itemType} to Database</h2>
                <p className="text-gray-400">Enter the product SKU. The product must already exist in the database.</p>
                
                <div className="flex flex-col gap-2">
                    <label htmlFor="sku" className="font-semibold text-gray-300">SKU Number (Varchar)</label>
                    <input
                        id="sku"
                        // --- [FIX 2] Change type to "text" ---
                        type="text" 
                        value={sku}
                        onChange={e => setSku(e.target.value)}
                        placeholder="e.g., ABC-12345"
                        className="bg-gray-900 border border-gray-600 text-gray-200 rounded-lg p-3 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full"
                    />
                </div>
                
                <div className="flex flex-col gap-2">
                    <label htmlFor="type" className="font-semibold text-gray-300">Type</label>
                    <select
                        id="type"
                        value={type}
                        onChange={e => setType(e.target.value as ImageType)}
                        className="bg-gray-900 border border-gray-600 text-gray-200 rounded-lg p-3 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full"
                    >
                        <option value="Wax">Wax</option>
                        <option value="Cast">Cast</option>
                        <option value="Final">Final</option>
                    </select>
                </div>

                {/* NOTE: Your App.tsx has logic for 'saveAsPreImage' but your modal
                  doesn't have the checkbox. The backend code I wrote *supports* it,
                  but the frontend App.tsx will never send 'true' because the
                  SaveModal.tsx doesn't have the checkbox.
                  
                  Your App.tsx `handleSaveToDb` also has a bug where it's
                  expecting 'saveAsPreImage' but the modal doesn't send it.
                  I will fix this in the next file.
                */}

                <div className="flex items-center justify-end gap-4 mt-4">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="text-center bg-white/10 border border-white/20 text-gray-200 font-semibold py-3 px-6 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 active:scale-95 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !sku.trim()}
                        className="text-center bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-xl hover:-translate-y-px active:scale-95 disabled:from-blue-800 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Saving...' : 'Update Product'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveModal;