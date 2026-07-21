// components/ui/Feedback.tsx
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Sparkles } from 'lucide-react';
import Button from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className
}: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 min-h-[320px] rounded-xl border border-dashed border-border/80 bg-secondary/20 relative overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none opacity-20" />
      
      <div className="w-12 h-12 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center text-primary mb-4 relative z-10">
        {icon || <Sparkles className="w-5 h-5" />}
      </div>
      
      <h3 className="text-base font-bold tracking-tight text-foreground mb-1 relative z-10">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-5 leading-relaxed relative z-10">{description}</p>
      
      {actionText && onAction && (
        <Button
          variant="primary"
          size="sm"
          onClick={onAction}
          className="relative z-10"
        >
          {actionText}
        </Button>
      )}
    </motion.div>
  );
};

export interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'text' | 'circle';
  count?: number;
  className?: string;
}

export const LoadingSkeleton = ({
  variant = 'text',
  count = 1,
  className
}: LoadingSkeletonProps) => {
  const getStyles = () => {
    switch (variant) {
      case 'card':
        return "h-40 w-full rounded-xl";
      case 'list':
        return "h-16 w-full rounded-lg";
      case 'circle':
        return "h-12 w-12 rounded-full";
      default:
        return "h-4 w-full rounded";
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={cn(
            "bg-secondary/70 animate-pulse border border-border/40",
            getStyles(),
            className
          )}
        />
      ))}
    </div>
  );
};
export default EmptyState;
