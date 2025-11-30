/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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

// Configuration for the Preset Buttons
const PRESETS = {
    'Description': [
        { id: 'Sketch_description', label: 'Sketch', prompt: "Describe the hand-drawn sketch or digital concept drawing. Focus on the artistic lines, shading, and initial design intent." },
        { id: 'Wax_description', label: 'Wax', prompt: "Describe the 3D wax model prototype, focusing on the precision, CAD design details, and the green/blue wax material." },
        { id: 'Cast_description', label: 'Cast', prompt: "Describe the raw metal casting of the jewelry. Focus on the matte/rough texture, the gold/silver material, and the unpolished state." },
        { id: 'Final_description', label: 'Final', prompt: "Write a luxurious, commercial product description for the finished, polished jewelry piece. Highlight the craftsmanship, gemstones, and shine." },
    ],
    'Alt Description': [
        { id: 'Sketch_alt', label: 'Sketch', prompt: "Write a concise Alt Text for a preliminary jewelry design sketch." },
        { id: 'Wax_alt', label: 'Wax', prompt: "Write a concise Alt Text for a 3D printed wax model of a jewelry piece." },
        { id: 'Cast_alt', label: 'Cast', prompt: "Write a concise Alt Text for a raw gold/silver metal casting of a jewelry piece." },
        { id: 'Final_alt', label: 'Final', prompt: "Write a descriptive, SEO-friendly Alt Text for the finished, polished jewelry product." },
    ],
    'Meta Description': [
        { id: 'Product_name', label: 'Product Name', prompt: "Generate a concise, commercially attractive Product Name based on this image. Keep it under 50 characters." },
        { id: 'Meta_title', label: 'Meta Title', prompt: "Write a SEO-optimized Meta Title (under 60 chars) including key product features." },
        { id: 'Meta_description', label: 'Meta Desc', prompt: "Write a SEO-friendly Meta Description (under 160 chars) with a call to action." },
    ]
};

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

  // State to track which specific field we are targeting (e.g., 'Wax_description')
  const [selectedTarget, setSelectedTarget] = useState<string>('');

  // Reset/Default target when tab changes
  useEffect(() => {
      // Default to the first option of the active tab
      const defaults = PRESETS[activeTab];
      if (defaults && defaults.length > 0) {
          setSelectedTarget(defaults[0].id);
          // Optional: Auto-fill prompt on tab change if empty? 
          // Currently keeping it empty to let user choose.
      }
  }, [activeTab]);

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  // Handle clicking a preset button
  const handlePresetClick = (targetId: string, defaultPrompt: string) => {
      setSelectedTarget(targetId);
      
      // Only fill the prompt if it's currently empty
      // This allows users to select a target without losing their custom text
      if (!prompt.trim()) {
          onPromptChange(defaultPrompt);
      }
  };

  // Format target ID for display (e.g. "Wax_description" -> "Wax Description")
  const formatButtonName = (id: string) => {
      return id.replace(/_/g, ' ');
  };

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col md:flex-row gap-6 animate-fade-in backdrop-blur-sm">
      {/* Left side: Input */}
      <div className="flex-1 flex flex-col gap-4">
        <h3 className="text-xl font-semibold text-gray-200">Generate Text</h3>
        
        {/* Tabs */}
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

        {/* Dynamic Preset Buttons */}
        <div className="flex gap-2 flex-wrap flex items-center justify-center">
            {PRESETS[activeTab].map((preset) => (
                <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset.id, preset.prompt)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors border font-medium ${
                        selectedTarget === preset.id 
                        ? 'bg-blue-500/20 border-blue-500 text-blue-200 ring-1 ring-blue-500' // Active State
                        : 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' // Inactive State
                    }`}
                >
                    {preset.label}
                </button>
            ))}
        </div>

        <p className="text-gray-400 text-sm flex items-center justify-center">
          You are under RHAYZE STUDIO surveillance.
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
        
        {description && !isLoading && (
            <div className="flex flex-col gap-2">
                {/* Info label showing where it will save */}
                {/* <div className="text-xs text-gray-400 text-center">
                    Saving to: <span className="text-blue-400 font-mono">{selectedTarget}</span>
                </div> */}

                <button
                    onClick={() => onInitiateSave(selectedTarget)}
                    disabled={isSaved || !selectedTarget}
                    className="flex items-center justify-center gap-2 w-full bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-green-800 disabled:to-green-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                >
                    {isSaved ? <CheckIcon className="w-5 h-5" /> : <SaveIcon className="w-5 h-5" />}
                    {isSaved ? 'Saved' : `Save to ${formatButtonName(selectedTarget)}`}
                </button>
            </div>
        )}

        {isLoading && !description && (
            <div className="flex items-center justify-center h-full">
              <Spinner />
            </div>
        )}
      </div>
    </div>
  );
};

export default DescribePanel;