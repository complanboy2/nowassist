import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import clsx from 'clsx';

// Custom styled dropdown component
const CustomDropdown = ({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Select...', 
  className = '',
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className={clsx('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          'w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-900',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          'transition flex items-center justify-between gap-2',
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-300 cursor-pointer',
          isOpen && 'border-primary ring-2 ring-primary/20'
        )}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className={clsx('h-4 w-4 flex-shrink-0 text-slate-500 transition-transform', isOpen && 'transform rotate-180')} />
      </button>
      
      {isOpen && !disabled && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 w-full mt-1 bg-white border-2 border-slate-200 rounded-lg shadow-xl max-h-60 overflow-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={clsx(
                  'w-full text-left px-3 py-2 text-sm transition',
                  'hover:bg-slate-50 focus:bg-slate-50 focus:outline-none',
                  value === option.value && 'bg-primary/10 text-primary font-medium'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CustomDropdown;

