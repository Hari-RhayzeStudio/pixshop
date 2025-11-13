/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
// We no longer import ImageType, as 'type' will be a more general string
// import { ImageType } from '../types'; 

interface SaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    // --- [CHANGED] onSave now accepts 'type' as a string ---
    // This allows it to be "Wax", "Cast", "Final", "Wax_alt", etc.
    onSave: (sku: string, type: string) => void;
    itemType: 'Image' | 'Description';
    isSaving: boolean;
}

const SaveModal: React.FC<SaveModalProps> = ({ isOpen, onClose, onSave, itemType, isSaving }) => {
    const [sku, setSku] = useState('');
    // --- [CHANGED] 'type' is now a generic string, defaulting to "Wax" ---
    const [type, setType] = useState<string>('Wax');

    useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens
            setSku('');
            // Default to 'Wax' for both types
            setType('Wax');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (sku.trim() && type) {
            // This now correctly sends a string (e.g., "Wax_alt")
            onSave(sku.trim(), type); 
        }
    };

    // --- [NEW] This function renders the correct options ---
    const renderOptions = () => {
        if (itemType === 'Image') {
            return (
                <>
                    <option value="Wax">Wax Image</option>
                    <option value="Cast">Cast Image</option>
                    <option value="Final">Final Image</option>
                </>
            );
        }
        
        // itemType === 'Description'
        return (
            <>
                <option value="Wax">Wax Description</option>
                <option value="Cast">Cast Description</option>
                <option value="Final">Final Description</option>
                <option value="Wax_alt">Wax Alt Text</option>
                <option value="Cast_alt">Cast Alt Text</option>
                <option value="Final_alt">Final Alt Text</option>
            </>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 shadow-2xl w-full max-w-md flex flex-col gap-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-100">Save {itemType} to Database</h2>
                <p className="text-gray-400">Enter the product SKU and select the save location. The product must already exist.</p>
                
                <div className="flex flex-col gap-2">
                    <label htmlFor="sku" className="font-semibold text-gray-300">SKU Number (Varchar)</label>
                    <input
                        id="sku"
                        type="text" // Your DB schema is Varchar
                        value={sku}
                        onChange={e => setSku(e.target.value)}
                        placeholder="e.g., ABC-12345"
                        className="bg-gray-900 border border-gray-600 text-gray-200 rounded-lg p-3 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full"
                    />
                </div>
                
                <div className="flex flex-col gap-2">
                    <label htmlFor="type" className="font-semibold text-gray-300">Save Location</label>
                    <select
                        id="type"
                        value={type}
                        onChange={e => setType(e.target.value)}
                        className="bg-gray-900 border border-gray-600 text-gray-200 rounded-lg p-3 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full"
                    >
                        {/* --- [NEW] Call the renderOptions function --- */}
                        {renderOptions()}
                    </select>
                </div>

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