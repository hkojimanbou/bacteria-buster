import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { EmotionDictionaryModal } from './EmotionDictionaryModal';

interface SelectWithAddProps {
  label: React.ReactNode;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  showDictionary?: boolean;
}

export function SelectWithAdd({ label, options, selectedValues, onChange, placeholder = '選択...', showDictionary = false }: SelectWithAddProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDictOpen, setIsDictOpen] = useState(false);
  const [customWord, setCustomWord] = useState('');
  const [customOptions, setCustomOptions] = useState<string[]>([]);

  const safeOptions = Array.isArray(options) ? options : [];
  const safeCustom = Array.isArray(customOptions) ? customOptions : [];
  const allOptions = Array.from(new Set([...safeOptions, ...safeCustom]));
  const safeSelected = Array.isArray(selectedValues) ? selectedValues : [];

  const toggleOption = (val: string) => {
    const strVal = String(val);
    if (safeSelected.includes(strVal)) {
      onChange(safeSelected.filter(v => v !== strVal));
    } else {
      onChange([...safeSelected, strVal]);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = String(customWord).trim();
    if (w !== '' && !allOptions.includes(w)) {
      setCustomOptions(prev => [...prev, w]);
      onChange([...safeSelected, w]);
      setCustomWord('');
    }
  };

  const removeVal = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(safeSelected.filter(v => v !== String(val)));
  };

  return (
    <div className="form-group relative">
      <div className="flex items-start justify-between mb-2">
        <label className="form-label mb-0">{label}</label>
        {showDictionary && (
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDictOpen(true);
            }}
            className="flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-white hover:bg-gray-50 px-2.5 py-1 rounded-full transition-colors border-2 border-gray-400 mt-1"
          >
            <BookOpen size={12} />
            感情リスト
          </button>
        )}
      </div>
      
      <div 
        className="form-input flex items-center flex-wrap gap-2 cursor-pointer min-h-[50px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        {safeSelected.length === 0 ? (
          <div className="text-muted">{String(placeholder)}</div>
        ) : (
          safeSelected.map((val, idx) => (
            <div key={`sel-${idx}`} className="badge flex items-center gap-1">
              <div>{String(val)}</div>
              <div 
                className="cursor-pointer opacity-70 hover:opacity-100 px-1 font-bold"
                onClick={(e) => removeVal(val, e)}
              >
                ×
              </div>
            </div>
          ))
        )}
      </div>

      {isOpen ? (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col overflow-hidden max-h-80">
          
          <form onSubmit={handleCustomSubmit} className="p-3 border-b flex gap-2 bg-gray-50">
            <input
              type="text"
              value={customWord}
              onChange={(e) => setCustomWord(e.target.value)}
              placeholder="新しい単語を追加..."
              className="flex-1 form-input text-sm py-1.5"
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              type="submit" 
              className="btn btn-primary py-1 px-3 text-sm"
              disabled={!customWord.trim()}
            >
              追加
            </button>
          </form>

          <div className="overflow-y-auto p-2 flex flex-wrap gap-2">
            {allOptions.map((opt, idx) => {
              const isSel = safeSelected.includes(String(opt));
              return (
                <div
                  key={`opt-${idx}`}
                  onClick={() => toggleOption(opt)}
                  className={`badge interactive ${isSel ? 'selected' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                >
                  {isSel ? '✓ ' : ''}{String(opt)}
                </div>
              );
            })}
          </div>
          
          <div className="p-2 border-t text-center">
             <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="text-sm font-semibold text-indigo-600 w-full py-1 hover:bg-indigo-50 rounded"
             >
               閉じる
             </button>
          </div>
        </div>
      ) : null}
      
      {isOpen ? (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsOpen(false)} 
        />
      ) : null}

      {isDictOpen && (
        <EmotionDictionaryModal
          initialSelected={safeSelected}
          onComplete={(newSelected) => {
            onChange(newSelected);
            setIsDictOpen(false);
          }}
          onClose={() => setIsDictOpen(false)}
        />
      )}
    </div>
  );
}
