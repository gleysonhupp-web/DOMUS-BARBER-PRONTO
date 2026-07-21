// components/ui/Select.tsx
"use client";

import React, { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  className,
  label,
  error,
  options,
  id,
  ...props
}, ref) => {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "w-full bg-secondary border border-border/80 text-foreground text-sm rounded-lg px-3.5 py-2.5 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50 disabled:pointer-events-none appearance-none cursor-pointer pr-10",
            error && "border-destructive focus:border-destructive focus:ring-destructive/10",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-card text-foreground">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 text-muted-foreground pointer-events-none">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && (
        <span className="text-xs text-destructive mt-0.5 ml-1 font-medium">{error}</span>
      )}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
