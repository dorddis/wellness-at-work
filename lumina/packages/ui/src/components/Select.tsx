'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  className = '',
  size = 'md',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const sizeClasses = {
    sm: 'py-1.5 px-3 text-xs',
    md: 'py-2 px-4 text-sm',
  };

  const optionSizeClasses = {
    sm: 'py-1.5 px-3 text-xs',
    md: 'py-2.5 px-4 text-sm',
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-foreground/80 mb-1.5">
          {label}
        </label>
      )}
      <div ref={containerRef} className="relative">
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full flex items-center justify-between gap-2
            ${sizeClasses[size]}
            bg-card border border-border rounded-lg
            font-medium text-foreground
            transition-all duration-200
            hover:border-border hover:bg-muted/50
            focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2
            ${isOpen ? 'ring-2 ring-black ring-offset-2' : ''}
          `}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedOption?.icon}
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div
            className="
              absolute z-50 w-full mt-1
              bg-card border border-border rounded-lg shadow-lg
              max-h-64 overflow-auto
            "
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between gap-2
                    ${optionSizeClasses[size]}
                    text-left transition-colors duration-100
                    first:rounded-t-lg last:rounded-b-lg
                    ${isSelected
                      ? 'bg-foreground text-white dark:text-background'
                      : 'text-foreground/80 hover:bg-secondary'
                    }
                  `}
                >
                  <span className="flex items-center gap-2 truncate">
                    {option.icon}
                    {option.label}
                  </span>
                  {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Select;
