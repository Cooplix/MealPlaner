import { useEffect, useId, useMemo, useState } from "react";

export type AutocompleteOption = {
  key: string;
  value: string;
  label: string;
  meta?: string;
};

type AutocompleteInputProps = {
  value: string;
  onChange: (value: string) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  disabled?: boolean;
  containerClassName?: string;
  inputClassName?: string;
  listClassName?: string;
  onSelect?: (option: AutocompleteOption) => void;
  maxItems?: number;
  ariaLabel?: string;
};

const DEFAULT_MAX_ITEMS = 8;

export default function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  containerClassName,
  inputClassName,
  listClassName,
  onSelect,
  maxItems = DEFAULT_MAX_ITEMS,
  ariaLabel,
}: AutocompleteInputProps) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const visibleOptions = useMemo(
    () => options.slice(0, Math.max(0, maxItems)),
    [options, maxItems],
  );

  useEffect(() => {
    setHighlightIndex(0);
  }, [value, visibleOptions.length]);

  const hasOptions = visibleOptions.length > 0;
  const showList = isOpen && hasOptions && !disabled;

  function handleSelect(option: AutocompleteOption) {
    if (onSelect) {
      onSelect(option);
    } else {
      onChange(option.value);
    }
    setIsOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!hasOptions || disabled) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightIndex((prev) => Math.min(prev + 1, visibleOptions.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (event.key === "Enter" && isOpen) {
      event.preventDefault();
      const option = visibleOptions[highlightIndex];
      if (option) {
        handleSelect(option);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
    }
  }

  return (
    <div className={`relative ${containerClassName ?? ""}`}>
      <input
        className={inputClassName}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
          if (!disabled) {
            setIsOpen(true);
          }
        }}
        onFocus={() => {
          if (!disabled) {
            setIsOpen(true);
          }
        }}
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-label={ariaLabel}
      />
      {showList && (
        <div
          id={listId}
          role="listbox"
          className={`absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg ${listClassName ?? ""}`}
        >
          <ul className="max-h-56 overflow-auto py-1 text-sm">
            {visibleOptions.map((option, index) => {
              const isActive = index === highlightIndex;
              return (
                <li
                  key={option.key}
                  role="option"
                  aria-selected={isActive}
                  className={`cursor-pointer px-3 py-2 transition-colors ${
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleSelect(option);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{option.label}</span>
                    {option.meta && (
                      <span className="text-xs text-gray-400">{option.meta}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
