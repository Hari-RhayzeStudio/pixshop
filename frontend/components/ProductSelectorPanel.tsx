/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ProductSummary } from '../types';

interface ProductSelectorPanelProps {
    products: ProductSummary[];
    selectedCategory: string;
    setSelectedCategory: (category: string) => void;
    selectedSku: string;
    setSelectedSku: (sku: string) => void;
    targetType?: string; 
    setTargetType?: (type: string) => void;
}

const ProductSelectorPanel: React.FC<ProductSelectorPanelProps> = ({
    products,
    selectedCategory,
    setSelectedCategory,
    selectedSku,
    setSelectedSku,
    targetType,
    setTargetType
}) => {
    // State for custom SKU dropdown
    const [isSkuDropdownOpen, setIsSkuDropdownOpen] = useState(false);
    const [skuSearchTerm, setSkuSearchTerm] = useState('');
    const skuDropdownRef = useRef<HTMLDivElement>(null);

    // --- 1. Close dropdown when clicking outside ---
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (skuDropdownRef.current && !skuDropdownRef.current.contains(event.target as Node)) {
                setIsSkuDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- 2. Get Unique Categories ---
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category));
        return Array.from(cats).sort();
    }, [products]);

    // --- 3. Filter & Sort SKUs ---
    const processedSkus = useMemo(() => {
        if (!selectedCategory) return [];

        // A. Filter by Category
        let filtered = products.filter(p => p.category === selectedCategory);

        // B. Filter by Search Term (inside dropdown)
        if (skuSearchTerm) {
            const lowerTerm = skuSearchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.sku.toLowerCase().includes(lowerTerm) || 
                (p.meta_title && p.meta_title.toLowerCase().includes(lowerTerm))
            );
        }

        // C. Sort: Orange -> Normal (White) -> Green
        // We assign weights: Orange=1, Normal=2, Green=3
        const colorWeight = { 'orange': 1, 'normal': 2, 'green': 3 };
        
        return filtered.sort((a, b) => {
            const weightA = colorWeight[a.statusColor] || 2;
            const weightB = colorWeight[b.statusColor] || 2;
            
            // If colors are different, sort by color priority
            if (weightA !== weightB) {
                return weightA - weightB;
            }
            
            // If colors are same, sort alphanumerically by SKU
            return a.sku.localeCompare(b.sku, undefined, { numeric: true });
        });

    }, [products, selectedCategory, skuSearchTerm]);

    const currentProduct = products.find(p => p.sku === selectedSku);
    
    const selectClasses = "bg-gray-900 text-white border border-[#722E85] rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#D6B890] outline-none transition duration-150 ease-in-out w-full";
    const disabledClasses = "opacity-50 cursor-not-allowed";

    const getStatusColor = (status: string) => {
        if (status === 'green') return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]';
        if (status === 'orange') return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]';
        return 'bg-gray-400'; // Normal/White
    };

    return (
        <div className="w-full bg-gray-800/60 border border-[#722E85]/50 rounded-lg p-4 flex flex-col sm:flex-row gap-4 items-end sm:items-center animate-fade-in backdrop-blur-sm mb-4 relative z-20">
            
            {/* Category Selector (Standard Select) */}
            <div className="flex flex-col w-full sm:w-1/3">
                <label className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Category</label>
                <select 
                    value={selectedCategory} 
                    onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setSelectedSku('');
                        setSkuSearchTerm('');
                    }}
                    className={`${selectClasses}`}
                >
                    <option value="">-- Select --</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* SKU Selector (Custom Searchable Dropdown) */}
            <div className="flex flex-col w-full sm:w-1/3 relative" ref={skuDropdownRef}>
                <label className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">SKU</label>
                
                {/* Trigger Button (Looks like a select input) */}
                <div 
                    className={`${selectClasses} cursor-pointer flex items-center justify-between ${!selectedCategory ? disabledClasses : ''}`}
                    onClick={() => selectedCategory && setIsSkuDropdownOpen(!isSkuDropdownOpen)}
                >
                    <div className="flex items-center gap-2 truncate">
                        {selectedSku ? (
                            <>
                                <div className={`w-2 h-2 rounded-full ${getStatusColor(currentProduct?.statusColor || 'normal')}`}></div>
                                <span>{selectedSku}</span>
                                {currentProduct?.meta_title && (
                                    <span className="text-gray-500 text-xs truncate ml-1">- {currentProduct.meta_title.substring(0, 15)}...</span>
                                )}
                            </>
                        ) : (
                            <span className="text-gray-400">-- Select SKU --</span>
                        )}
                    </div>
                    {/* Chevron Icon */}
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isSkuDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>

                {/* Dropdown Menu */}
                {isSkuDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-gray-900 border border-[#722E85] rounded-md shadow-2xl z-50 overflow-hidden flex flex-col">
                        {/* Sticky Search Input */}
                        <div className="p-2 border-b border-gray-700 bg-gray-900 sticky top-0 z-10">
                            <input 
                                type="text" 
                                value={skuSearchTerm}
                                onChange={(e) => setSkuSearchTerm(e.target.value)}
                                placeholder="Search SKU..." 
                                className="w-full bg-gray-800 text-white text-sm px-2 py-1.5 rounded border border-gray-600 focus:border-[#D6B890] outline-none"
                                autoFocus
                            />
                        </div>

                        {/* Scrollable List (Max ~5 items height) */}
                        <div className="max-h-[180px] overflow-y-auto"> 
                            {processedSkus.length > 0 ? (
                                processedSkus.map(prod => (
                                    <div 
                                        key={prod.sku}
                                        onClick={() => {
                                            setSelectedSku(prod.sku);
                                            setIsSkuDropdownOpen(false);
                                        }}
                                        className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-3 hover:bg-gray-800 transition-colors ${selectedSku === prod.sku ? 'bg-gray-800' : ''}`}
                                    >
                                        {/* Status Dot */}
                                        <div className={`w-3 h-3 flex-shrink-0 rounded-full ${getStatusColor(prod.statusColor)}`}></div>
                                        
                                        {/* SKU & Title */}
                                        <div className="flex flex-col truncate">
                                            <span className="text-white font-mono">{prod.sku}</span>
                                            {prod.meta_title && <span className="text-xs text-gray-500 truncate">{prod.meta_title}</span>}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-3 py-2 text-sm text-gray-500 text-center">No SKUs found</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Target Type Selector */}
            {setTargetType && (
                <div className="flex flex-col w-full sm:w-1/3">
                    <label className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Target</label>
                    <select 
                        value={targetType} 
                        onChange={(e) => setTargetType(e.target.value)}
                        className={`${selectClasses}`}
                    >
                        <option value="Pre">Pre (Concept)</option>
                        <option value="Sketch">Sketch</option>
                        <option value="Wax">Wax</option>
                        <option value="Cast">Cast</option>
                        <option value="Final">Final</option>
                    </select>
                </div>
            )}

            {/* Detailed Status Indicator (Visible when SKU selected) */}
            {selectedSku && currentProduct && (
                <div className="flex flex-col items-center justify-center ml-2 pb-2 sm:pb-0">
                    <div 
                        className={`w-4 h-4 rounded-full ${getStatusColor(currentProduct.statusColor)}`} 
                        title={`Status: ${currentProduct.statusColor}`}
                    ></div>
                </div>
            )}
        </div>
    );
};

export default ProductSelectorPanel;