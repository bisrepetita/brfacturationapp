"use client";

import { cn } from "@/lib/utils";

interface FilterChip {
  value: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  chips: FilterChip[];
  selected: string;
  onChange: (value: string) => void;
  className?: string;
}

export function FilterChips({ chips, selected, onChange, className }: FilterChipsProps) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1 scrollbar-none", className)}>
      {chips.map((chip) => (
        <button
          key={chip.value}
          onClick={() => onChange(chip.value)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap press-effect transition-colors",
            selected === chip.value
              ? "bg-[#1A1A18] text-white"
              : "bg-[#F0EDE8] text-[#7A7570] hover:text-[#1A1A18] border border-[#E5E1DA]"
          )}
        >
          {chip.label}
          {chip.count !== undefined && (
            <span
              className={cn(
                "text-[11px] px-1 rounded-full",
                selected === chip.value ? "bg-white/20 text-white" : "bg-[#E5E1DA] text-[#7A7570]"
              )}
            >
              {chip.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
