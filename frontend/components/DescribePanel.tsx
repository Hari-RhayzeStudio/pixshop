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
  onInitiateSave: () => void;
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

        <p className="text-gray-400 text-sm">
          Refine your request (e.g., "make it poetic" or "focus on texture").
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
          <button
            onClick={onInitiateSave}
            disabled={isSaved}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-green-800 disabled:to-green-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSaved ? <CheckIcon className="w-5 h-5" /> : <SaveIcon className="w-5 h-5" />}
            {isSaved ? 'Saved' : 'Save to DB'}
          </button>
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