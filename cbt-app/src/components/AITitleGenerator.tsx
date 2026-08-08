import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface TitleInputProps {
  currentTitle: string;
  onTitleChange: (title: string) => void;
  onGenerate?: () => Promise<void>;
  isGenerating?: boolean;
}

export function AITitleGenerator({ currentTitle, onTitleChange, onGenerate, isGenerating }: TitleInputProps) {
  return (
    <div className="form-group bg-indigo-50/50 p-4 rounded-lg border border-indigo-100">
      <label className="form-label flex items-center justify-between">
        <span>タイトル</span>
        {onGenerate && (
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 py-1.5 px-3 rounded-full transition-colors disabled:opacity-50 font-medium"
          >
            {isGenerating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            AIで生成
          </button>
        )}
      </label>
      <input
        type="text"
        value={currentTitle}
        onChange={(e) => onTitleChange(e.target.value)}
        maxLength={30}
        placeholder="タイトルを入力、またはAIで生成"
        className="form-input mt-2"
        disabled={isGenerating}
      />
      <div className="text-right text-xs text-gray-500 mt-1">
        {currentTitle.length} / 30
      </div>
    </div>
  );
}
