// components/ui/Input.tsx
"use client";

import React, { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  className,
  type = 'text',
  label,
  error,
  icon,
  id,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  
  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-muted-foreground pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          id={inputId}
          className={cn(
            "w-full bg-secondary border border-border/80 text-foreground text-sm rounded-lg px-3.5 py-2.5 outline-none placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50 disabled:pointer-events-none",
            icon && "pl-10",
            error && "border-destructive focus:border-destructive focus:ring-destructive/10",
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <span className="text-xs text-destructive mt-0.5 ml-1 font-medium">{error}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  className,
  label,
  error,
  id,
  ...props
}, ref) => {
  const generatedId = useId();
  const textareaId = id || generatedId;
  
  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={textareaId} className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        className={cn(
          "w-full bg-secondary border border-border/80 text-foreground text-sm rounded-lg px-3.5 py-2.5 min-h-[100px] resize-y outline-none placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50 disabled:pointer-events-none",
          error && "border-destructive focus:border-destructive focus:ring-destructive/10",
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-xs text-destructive mt-0.5 ml-1 font-medium">{error}</span>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
export default Input;
