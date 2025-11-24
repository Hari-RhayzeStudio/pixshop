/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import Spinner from './Spinner';
import { CheckIcon, SaveIcon } from './icons';
import { DescriptionTab } from '../types';

interface DescribePanelProps {
  onGenerate: (prompt: string) => void;
  onInitiateSave: (target: string) => void;
  description: string | null;
  isSaved: boolean;
  isLoading: boolean;
  onDescriptionChange: (newDescription: string) => void;
  prompt: string;
  onPromptChange: (newPrompt: string) => void;
  activeTab: DescriptionTab;
  onTabChange: (tab: DescriptionTab) => void;
}

const descriptionTabs: DescriptionTab[] = ['Description', 'Alt Description', 'Meta Description'];

const DescribePanel: React.FC<DescribePanelProps> = ({
  onGenerate,
  onInitiateSave,
  description,
  isSaved,
  isLoading,
  onDescriptionChange,
  prompt,
  onPromptChange,
  activeTab,
  onTabChange
}) => {

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  const applyPreset = (target: string) => {
    switch (target) {
        // --- Description Tab Presets ---
        case 'wax_desc':
            onPromptChange("Describe the 3D wax model prototype, focusing on the precision, CAD design details, and the green/blue wax material.");
            break;
        case 'cast_desc':
            onPromptChange("Describe the raw metal casting of the jewelry. Focus on the matte/rough texture, the gold/silver material, and the unpolished state.");
            break;
        case 'final_desc':
            onPromptChange("Write a luxurious, commercial product description for the finished, polished jewelry piece. Highlight the craftsmanship, gemstones, and shine.");
            break;

        // --- Alt Description Tab Presets ---
        case 'wax_alt':
            onPromptChange("Write a concise Alt Text for a 3D printed wax model of a jewelry piece.");
            break;
        case 'cast_alt':
            onPromptChange("Write a concise Alt Text for a raw gold/silver metal casting of a jewelry piece.");
            break;
        case 'final_alt':
            onPromptChange("Write a descriptive, SEO-friendly Alt Text for the finished, polished jewelry product.");
            break;

        // --- Meta Tab Presets ---
        case 'prod_name':
            onPromptChange("Generate a concise, commercially attractive Product Name based on this image. Keep it under 50 characters.");
            break;
        case 'meta_title':
            onPromptChange("Write a SEO-optimized Meta Title (under 60 chars) including key product features.");
            break;
        case 'meta_desc':
            onPromptChange("Write a SEO-friendly Meta Description (under 160 chars) with a call to action.");
            break;
    }
  };

  const renderSaveButtons = () => {
      if (!description || isLoading) return null;

      const btnClass = "flex items-center justify-center gap-2 flex-1 bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-2 px-3 text-sm rounded-lg transition-all duration-300 shadow-lg hover:shadow-green-500/40 active:scale-95 disabled:opacity-50";

      if (activeTab === 'Description') {
          return (
              <div className="flex flex-wrap gap-2 mt-2">
                  <button onClick={() => onInitiateSave('Wax_description')} className={btnClass}><SaveIcon className="w-4 h-4"/> Save Wax Desc</button>
                  <button onClick={() => onInitiateSave('Cast_description')} className={btnClass}><SaveIcon className="w-4 h-4"/> Save Cast Desc</button>
                  <button onClick={() => onInitiateSave('Final_description')} className={btnClass}><SaveIcon className="w-4 h-4"/> Save Final Desc</button>
              </div>
          );
      }
      if (activeTab === 'Alt Description') {
          return (
               <div className="flex flex-wrap gap-2 mt-2">
                  <button onClick={() => onInitiateSave('Wax_alt')} className={btnClass}><SaveIcon className="w-4 h-4"/> Save Wax Alt</button>
                  <button onClick={() => onInitiateSave('Cast_alt')} className={btnClass}><SaveIcon className="w-4 h-4"/> Save Cast Alt</button>
                  <button onClick={() => onInitiateSave('Final_alt')} className={btnClass}><SaveIcon className="w-4 h-4"/> Save Final Alt</button>
              </div>
          );
      }
      if (activeTab === 'Meta Description') {
          return (
               <div className="flex flex-wrap gap-2 mt-2">
                  <button onClick={() => onInitiateSave('Product_name')} className={btnClass}><SaveIcon className="w-4 h-4"/> Save Name</button>
                  <button onClick={() => onInitiateSave('Meta_title')} className={btnClass}><SaveIcon className="w-4 h-4"/> Save Title</button>
                  <button onClick={() => onInitiateSave('Meta_description')} className={btnClass}><SaveIcon className="w-4 h-4"/> Save Meta Desc</button>
              </div>
          );
      }
      return null;
  };

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col md:flex-row gap-6 animate-fade-in backdrop-blur-sm">
      {/* Left side: Input */}
      <div className="flex-1 flex flex-col gap-4">
        <h3 className="text-xl font-semibold text-gray-200">Generate Text</h3>
        
        {/* Tabs for different description types */}
        <div className="flex items-center gap-2 bg-gray-900/50 p-1.5 rounded-lg">
          {descriptionTabs.map(tab => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`w-full text-sm font-semibold py-2 px-3 rounded-md transition-all duration-200 ${
                activeTab === tab
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Description' && (
            <div className="flex gap-2 flex-wrap flex items-center justify-center">
                <button onClick={() => applyPreset('wax_desc')} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-full transition-colors border border-gray-600 font-medium">
                    Wax desc
                </button>
                <button onClick={() => applyPreset('cast_desc')} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-full transition-colors border border-gray-600 font-medium">
                    Cast desc
                </button>
                <button onClick={() => applyPreset('final_desc')} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-full transition-colors border border-gray-600 font-medium">
                    Final desc
                </button>
            </div>
        )}

        {/* 2. Alt Description Tab Options */}
        {activeTab === 'Alt Description' && (
            <div className="flex gap-2 flex-wrap flex items-center justify-center">
                <button onClick={() => applyPreset('wax_alt')} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-full transition-colors border border-gray-600 font-medium">
                    Wax Alt
                </button>
                <button onClick={() => applyPreset('cast_alt')} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-full transition-colors border border-gray-600 font-medium">
                    Cast Alt
                </button>
                <button onClick={() => applyPreset('final_alt')} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-full transition-colors border border-gray-600 font-medium">
                    Final Alt
                </button>
            </div>
        )}

        {/* 3. Meta Description Tab Options */}
        {activeTab === 'Meta Description' && (
            <div className="flex gap-2 flex-wrap Z items-center justify-center">
                <button onClick={() => applyPreset('prod_name')} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-full transition-colors border border-gray-600 font-medium">
                    Product Name
                </button>
                <button onClick={() => applyPreset('meta_title')} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-full transition-colors border border-gray-600 font-medium">
                    Meta Title
                </button>
                <button onClick={() => applyPreset('meta_desc')} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-full transition-colors border border-gray-600 font-medium">
                    Meta Desc
                </button>
            </div>
        )}

        <p className="text-gray-400 text-sm flex items-center justify-center">
          You are under RHAYZE STUDIO servilance.
        </p>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={`Enter instructions for ${activeTab}...`}
          className="flex-grow bg-gray-900/70 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base min-h-[100px]"
          disabled={isLoading}
          rows={3}
        />
        <button
          onClick={handleGenerate}
          className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
          disabled={isLoading || !prompt.trim()}
        >
          {isLoading ? 'Generating...' : `Generate ${activeTab}`}
        </button>
      </div>

      {/* Right side: Output */}
      <div className="flex-1 flex flex-col gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
        <h4 className="font-semibold text-gray-300">Generated Text (Editable)</h4>
        
        <textarea
          value={description || ''}
          onChange={(e) => onDescriptionChange(e.target.value)}
          disabled={isLoading}
          placeholder="Your generated text will appear here. You can edit it directly."
          className="flex-grow min-h-[150px] bg-gray-900/80 rounded-md p-4 text-gray-300 overflow-y-auto focus:ring-2 focus:ring-blue-500 focus:outline-none transition disabled:opacity-60"
        />
        
        {/* {description && !isLoading && (
          <button
            // onClick={handleSmartSave}
            disabled={isSaved}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-green-800 disabled:to-green-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSaved ? <CheckIcon className="w-5 h-5" /> : <SaveIcon className="w-5 h-5" />}
            {isSaved ? 'Saved' : 'Save to DB'}
          </button>
        )} */}
        {isLoading && !description && (
            <div className="flex items-center justify-center h-full">
              <Spinner />
            </div>
        )}
        {renderSaveButtons()}
      </div>
    </div>
  );
};

export default DescribePanel;