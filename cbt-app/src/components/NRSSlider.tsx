import React from 'react';

interface NRSSliderProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  minLabel?: string;
  maxLabel?: string;
}

export function NRSSlider({ label, value, onChange, minLabel = "全くない", maxLabel = "最大" }: NRSSliderProps) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      
      {/* 現在の選択値の表示 */}
      <div className="text-center mb-2">
        <span className="text-3xl font-bold text-indigo-600">{value !== null ? value : '-'}</span>
      </div>

      <div className="range-slider-container px-2 py-4 bg-gray-50 rounded-md border border-gray-100">
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value={value ?? 5}
          onChange={(e) => onChange(Number(e.target.value))}
          className="range-input w-full"
        />
        
        {/* 目盛りと数値 */}
        <div className="flex justify-between mt-2 text-xs text-gray-400 px-1">
          {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
            <div key={num} className="flex flex-col items-center" style={{ width: '10px' }}>
              <span className={value === num ? "text-indigo-600 font-bold" : ""}>|</span>
              <span className={`mt-1 ${value === num ? "text-indigo-600 font-bold" : ""}`}>
                {num === 0 || num === 5 || num === 10 ? num : ''}
              </span>
            </div>
          ))}
        </div>

        {/* 左右の補足テキスト */}
        <div className="flex justify-between mt-4 text-xs font-bold text-gray-700 px-1">
          <span className="text-left leading-tight max-w-[45%] break-words whitespace-pre-wrap">{minLabel}</span>
          <span className="text-right leading-tight max-w-[45%] break-words whitespace-pre-wrap">{maxLabel}</span>
        </div>
      </div>
    </div>
  );
}
