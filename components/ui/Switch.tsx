// components/ui/Switch.tsx
"use client";

import React, { forwardRef, useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  checked?: boolean;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(({
  className,
  label,
  checked,
  id,
  onChange,
  ...props
}, ref) => {
  const generatedId = useId();
  const switchId = id || generatedId;

  return (
    <div className="flex items-center gap-3 select-none">
      <label htmlFor={switchId} className="relative inline-flex items-center cursor-pointer">
        <input
          ref={ref}
          type="checkbox"
          id={switchId}
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
          {...props}
        />
        <div className={cn(
          "w-10 h-6 bg-secondary border border-border/80 rounded-full transition-colors duration-200 peer-checked:bg-primary/30 peer-checked:border-primary/50 relative",
          className
        )}>
          <motion.div
            animate={{ x: checked ? 18 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={cn(
              "absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full shadow-md",
              checked ? "bg-primary" : "bg-muted-foreground"
            )}
          />
        </div>
      </label>
      {label && (
        <label htmlFor={switchId} className="text-sm font-medium text-muted-foreground cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
});

Switch.displayName = 'Switch';
export default Switch;
