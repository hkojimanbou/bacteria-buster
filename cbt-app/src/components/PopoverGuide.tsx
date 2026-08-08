import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface PopoverGuideProps {
  content: React.ReactNode;
}

export function PopoverGuide({ content }: PopoverGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-flex items-center ml-2" ref={popoverRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors border ${
          isOpen 
            ? 'bg-indigo-500 text-white border-indigo-500' 
            : 'bg-white text-indigo-500 border-indigo-200 hover:bg-indigo-50'
        }`}
        title="ガイドを表示"
      >
        <HelpCircle size={12} />
        <span>ヒント</span>
      </button>

      {isOpen && (
        <div className="absolute z-[100] top-full left-0 mt-2">
          <div className="w-[max-content] max-w-[calc(100vw-48px)] sm:max-w-[320px] p-4 bg-white rounded-lg shadow-xl border border-gray-200 animate-fade-in text-left text-sm text-gray-700 leading-relaxed font-normal whitespace-normal tracking-normal break-words">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
