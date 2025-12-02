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
        { 
            id: 'Sketch_description', 
            label: 'Sketch', 
            prompt: `Write a short, engaging description (max 150 characters) for this jewelry design sketch. 
            
            1. **Hook:** Start with ONE of: 'From imagination to reality:', 'The vision begins:', 'Artistry in motion:', 'Blueprint of beauty:', 'A new idea:', 'Designed with love:', 'The first step:', 'Dream to design:', 'A creative spark:', 'Behind the scenes:', 'Your custom look:', 'Drawing the dream:', 'Paper to precious:', or 'Starting the journey:'.
            2. **Grammar Rule:** Do NOT start the next word with "This" or "The". Instead, start directly with the subject (e.g., "Custom lines...", "Hand-drawn details...") or a verb.
            3. **SEO Focus:** Mention 'custom jewelry design', 'concept', and 'bespoke'. Use simple English.` 
        },
        { 
            id: 'Wax_description', 
            label: 'Wax', 
            prompt: `Write a short description (max 150 characters) for this 3D printed wax prototype.
            
            1. **Hook:** Start with ONE of: 'Precision in progress:', 'Taking shape:', 'The mold of perfection:', 'Craftsmanship in 3D:', 'Almost ready:', 'See every detail:', 'A perfect fit:', '3D printed art:', 'Ready for casting:', 'The shape of style:', 'Model perfection:', 'Getting real:', 'Exact precision:', or 'The design comes alive:'.
            2. **Grammar Rule:** Do NOT start the next word with "This" or "The". Start with the material or a descriptive word (e.g., "Green wax captures...", "Every curve shows...").
            3. **SEO Focus:** Use keywords like '3D printed wax', 'jewelry prototype', and 'CAD design'. Emphasize it is a mold-ready model, NOT ready to wear.` 
        },
        { 
            id: 'Cast_description', 
            label: 'Cast', 
            prompt: `Write a short description (max 150 characters) for this raw metal casting.
            
            1. **Hook:** Start with ONE of: 'Polished and authentic:', 'Fresh from the fire:', 'The metal emerges:', 'Unpolished potential:', 'Solid metal style:', 'Freshly made:', 'Real craftsmanship:', 'Authentic texture:', 'The real thing:', 'Made by hand:', 'Straight from the workshop:', 'Pure metal:', 'The foundation:', or 'Hand casted:'.
            2. **Grammar Rule:** Do NOT start the next word with "This" or "The". Start with the metal type or texture (e.g., "Solid gold emerges...", "Matte silver texture...").
            3. **SEO Focus:** Mention 'rough casting', 'unpolished', and the specific metal Gold. Describe the matte texture. Do NOT imply it is finished.` 
        },
        { 
            id: 'Final_description', 
            label: 'Final', 
            prompt: `Write a persuasive, luxurious product description (max 150 characters).
            
            1. **Hook:** Start with ONE of: 'Introducing:', 'Behold the brilliance:', 'Radiance revealed:', 'The masterpiece arrives:', 'Shine bright:', 'Ready to wear:', 'Simply stunning:', 'Your new favorite:', 'Pure elegance:', 'Look at this:', 'Time to shine:', 'Luxury for you:', 'Catch the light:', or 'Unforgettable style:'.
            2. **Grammar Rule:** Do NOT start the next word with "This" or "The". Start with an adjective or the jewelry type (e.g., "Sparkling diamonds...", "Handcrafted perfection...", "Heirloom quality...").
            3. **SEO Focus:** Naturally include the Metal, Stone type, and Style. Focus on emotion and sparkle.` 
        },
    ],
    'Alt Description': [
        { 
            id: 'Sketch_alt', 
            label: 'Sketch Alt', 
            prompt: "STRICT OUTPUT RULE: Maximum 120 characters. No intro text. Generate high-SEO Alt Text for a jewelry sketch." 
        },
        { 
            id: 'Wax_alt', 
            label: 'Wax Alt', 
            prompt: "STRICT OUTPUT RULE: Maximum 120 characters. No intro text. Generate high-SEO Alt Text for a wax model."
        },
        { 
            id: 'Cast_alt', 
            label: 'Cast Alt', 
            prompt: "STRICT OUTPUT RULE: Maximum 120 characters. No intro text. Generate high-SEO Alt Text for a raw casting. " 
        },
        { 
            id: 'Final_alt', 
            label: 'Final Alt', 
            prompt: "STRICT OUTPUT RULE: Maximum 120 characters. No intro text. Generate high-SEO Alt Text for the finished product." 
        },
    ],
    'Meta Description': [
        { 
            id: 'Meta_title', 
            label: 'Meta Title', 
            prompt: "Write a Google Search Meta Title (max 50 characters). OUTPUT RULE: Maximum 60 characters." 
        },
        { 
            id: 'Product_name', 
            label: 'Prod Name', 
            prompt: "Generate a clickable, SEO-rich Product Name. OUTPUT RULE: Maximum 60 characters." 
        },
        { 
            id: 'Meta_description', 
            label: 'Meta Desc', 
            prompt: "Write a high-converting Meta Description (max 150 characters). Summarize the jewelry piece and end with a call to action like 'CUSTOMIZE YOURS' OR  'DESIGN YOURS' OR 'GET A QUOTE' OR 'INQUIRE NOW' OR 'FREE CONSULTATION' OR 'START CREATING'." 
        },
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
          onPromptChange(defaults[0].prompt);
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
      
      onPromptChange(defaultPrompt);
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