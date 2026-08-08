import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { NEGATIVE_EMOTIONS, POSITIVE_EMOTIONS } from '../constants/emotions';

interface EmotionDictionaryModalProps {
  initialSelected: string[];
  onComplete: (selected: string[]) => void;
  onClose: () => void;
}

export function EmotionDictionaryModal({ initialSelected, onComplete, onClose }: EmotionDictionaryModalProps) {
  const [activeTab, setActiveTab] = useState<'negative' | 'positive'>('negative');
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));

  const toggleWord = (word: string) => {
    const next = new Set(selected);
    if (next.has(word)) {
      next.delete(word);
    } else {
      next.add(word);
    }
    setSelected(next);
  };

  const handleComplete = () => {
    onComplete(Array.from(selected));
  };

  const currentData = activeTab === 'negative' ? NEGATIVE_EMOTIONS : POSITIVE_EMOTIONS;

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col animate-fade-in sm:max-w-md sm:mx-auto sm:shadow-2xl">
      {/* Header (Text removed, just close button) */}
      <div className="flex items-center justify-end p-2 border-b border-gray-200 bg-white">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="閉じる">
          <X size={24} className="text-gray-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50 gap-3 px-4 py-3">
        <button
          className={`px-4 py-1.5 text-xs font-bold transition-colors rounded-full border-2 ${
            activeTab === 'negative' 
              ? 'text-gray-700 border-gray-500 bg-white' 
              : 'text-gray-400 border-gray-300 bg-transparent hover:bg-white'
          }`}
          onClick={() => setActiveTab('negative')}
        >
          ネガティブ
        </button>
        <button
          className={`px-4 py-1.5 text-xs font-bold transition-colors rounded-full border-2 ${
            activeTab === 'positive' 
              ? 'text-gray-700 border-gray-500 bg-white' 
              : 'text-gray-400 border-gray-300 bg-transparent hover:bg-white'
          }`}
          onClick={() => setActiveTab('positive')}
        >
          ポジティブ
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 pb-32">
        <div className="space-y-6">
          {currentData.map((category) => (
            <div key={category.name} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 
                className="font-bold mb-3 flex items-center gap-1.5 border-b border-blue-200 pb-2"
                style={{ fontSize: '12.5px', color: '#0000FF' }}
              >
                <span style={{ fontSize: '10px', color: '#0000FF' }}>■</span>
                {category.name}
              </h3>
              <div className="flex flex-wrap gap-2">
                {category.words.map((word) => {
                  const isSelected = selected.has(word);
                  return (
                    <div
                      key={word}
                      onClick={() => toggleWord(word)}
                      className={`badge interactive ${isSelected ? 'selected' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                    >
                      {isSelected && <Check size={14} className="inline mr-1 -ml-1" />}
                      {word}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-600">
            選択中: <strong className="text-gray-900">{selected.size}</strong> 個
          </span>
          {selected.size > 0 && (
            <button 
              onClick={() => setSelected(new Set())}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              すべてクリア
            </button>
          )}
        </div>
        <button
          onClick={handleComplete}
          className="w-full btn btn-primary py-3 text-base shadow-lg flex items-center justify-center gap-2"
        >
          <Check size={20} />
          確定して戻る
        </button>
      </div>
    </div>
  );
}
