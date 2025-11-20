/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DescriptionTab, ImageType, DescriptionType } from '../types';

interface SaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (sku: string, type: string) => void;
    itemType: 'Image' | 'Description';
    // --- [NEW] We need to know WHICH description tab is active to show correct options ---
    descriptionTab?: DescriptionTab; 
    isSaving: boolean;
}

const SaveModal: React.FC<SaveModalProps> = ({ isOpen, onClose, onSave, itemType, descriptionTab, isSaving }) => {
    const [sku, setSku] = useState('');
    const [selectedOption, setSelectedOption] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setSku('');
            // Set default option based on context
            if (itemType === 'Image') {
                setSelectedOption('Wax');
            } else if (descriptionTab === 'Description') {
                setSelectedOption('Wax_description');
            } else if (descriptionTab === 'Alt Description') {
                setSelectedOption('Wax_alt');
            } else if (descriptionTab === 'Meta Description') {
                setSelectedOption('Meta_title');
            }
        }
    }, [isOpen, itemType, descriptionTab]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (sku.trim() && selectedOption) {
            onSave(sku.trim(), selectedOption);
        }
    };

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
        
        // Based on the ACTIVE TAB in the description panel
        if (descriptionTab === 'Description') {
            return (
                <>
                    <option value="Wax_description">Wax Description</option>
                    <option value="Cast_description">Cast Description</option>
                    <option value="Final_description">Final Description</option>
                </>
            );
        }
        if (descriptionTab === 'Alt Description') {
            return (
                <>
                    <option value="Wax_alt">Wax Alt Text</option>
                    <option value="Cast_alt">Cast Alt Text</option>
                    <option value="Final_alt">Final Alt Text</option>
                </>
            );
        }
        if (descriptionTab === 'Meta Description') {
            return (
                <>
                    <option value="Meta_title">Meta Title</option>
                    <option value="Meta_description">Meta Description</option>
                </>
            );
        }
        return null;
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 shadow-2xl w-full max-w-md flex flex-col gap-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-gray-100">Save {itemType} to Database</h2>
                <p className="text-gray-400">Enter the product SKU and select the save location.</p>
                
                <div className="flex flex-col gap-2">
                    <label htmlFor="sku" className="font-semibold text-gray-300">SKU Number</label>
                    <input
                        id="sku"
                        type="text"
                        value={sku}
                        onChange={e => setSku(e.target.value)}
                        placeholder="e.g., ABC-12345"
                        className="bg-gray-900 border border-gray-600 text-gray-200 rounded-lg p-3 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full"
                    />
                </div>
                
                <div className="flex flex-col gap-2">
                    <label htmlFor="saveLoc" className="font-semibold text-gray-300">Save Location</label>
                    <select
                        id="saveLoc"
                        value={selectedOption}
                        onChange={e => setSelectedOption(e.target.value)}
                        className="bg-gray-900 border border-gray-600 text-gray-200 rounded-lg p-3 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full"
                    >
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

