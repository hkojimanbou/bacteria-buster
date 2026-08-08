import React from 'react';

export interface CheckboxOption {
  id: string;
  label: string;
  description?: string;
}

interface CheckboxListProps {
  label: string;
  options: CheckboxOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}

export function CheckboxList({ label, options, selectedIds, onChange }: CheckboxListProps) {
  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="flex flex-col gap-3 p-2">
        {options.map(option => (
          <label key={option.id} className="custom-checkbox group">
            <input
              type="checkbox"
              checked={selectedIds.includes(option.id)}
              onChange={() => handleToggle(option.id)}
            />
            <div className="flex flex-col pt-0.5">
              <span className="font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">
                {option.label}
              </span>
              {option.description && (
                <span className="text-sm text-gray-500 mt-1 leading-snug">
                  {option.description}
                </span>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
