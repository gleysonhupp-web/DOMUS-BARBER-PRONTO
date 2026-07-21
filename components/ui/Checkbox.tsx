// components/ui/Checkbox.tsx
"use client";

import React, { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  className,
  label,
  error,
  checked,
  id,
  ...props
}, ref) => {
  const generatedId = useId();
  const checkboxId = id || generatedId;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={checkboxId} className="flex items-center gap-2.5 cursor-pointer select-none text-sm font-medium text-foreground">
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            checked={checked}
            className="sr-only peer"
            {...props}
          />
          <div className={cn(
            "w-5 h-5 bg-secondary border border-border/80 rounded transition-all peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 flex items-center justify-center",
            error && "border-destructive"
          )}
          >
            <Check className="w-3.5 h-3.5 text-primary-foreground stroke-[3px] scale-0 peer-checked:scale-100 transition-transform duration-150" />
          </div>
        </div>
        {label && <span className="text-sm font-medium text-muted-foreground peer-checked:text-foreground">{label}</span>}
      </label>
      {error && (
        <span className="text-xs text-destructive ml-1 font-medium">{error}</span>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
export default Checkbox;
