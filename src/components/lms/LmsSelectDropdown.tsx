"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type LmsSelectDropdownOption<T extends string | number> = {
  value: T;
  label: string;
  disabled?: boolean;
};

export default function LmsSelectDropdown<T extends string | number>({
  value,
  options,
  onChange,
  disabled = false,
  className = "w-full",
  menuClassName = "w-full",
  buttonClassName = "",
}: {
  value: T;
  options: LmsSelectDropdownOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        className={`flex h-10 w-full items-center justify-between gap-3 rounded-lg border px-3 text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 ${
          open
            ? "border-primary bg-white text-primary ring-2 ring-primary/15"
            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-primary/20 hover:bg-white"
        } ${buttonClassName}`}
        aria-expanded={open}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>

      {open && !disabled && (
        <div
          className={`absolute left-0 top-12 z-30 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 animate-in fade-in slide-in-from-top-1 zoom-in-95 duration-150 ${menuClassName}`}
        >
          {options.map((option) => {
            const selectedOption = option.value === value;

            return (
              <button
                key={String(option.value)}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  if (option.disabled) return;
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex h-9 w-full items-center justify-between rounded-lg px-2.5 text-left text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:text-slate-300 ${
                  selectedOption
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {selectedOption && <Check className="size-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
