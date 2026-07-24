// components/ui/Modal.tsx
"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  variant?: 'modal' | 'drawer';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  variant = 'modal',
  size = 'md'
}: ModalProps) => {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-5xl"
  };

  const isDrawer = variant === 'drawer';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal / Drawer wrapper */}
          <div className={cn(
            "fixed z-50 w-full inset-0 flex items-center justify-center p-4 overflow-y-auto pointer-events-none",
            isDrawer ? "inset-y-0 right-0 p-0 max-w-md justify-end" : ""
          )}>
            <motion.div
              initial={isDrawer ? { x: "100%" } : { opacity: 0, scale: 0.95, y: 10 }}
              animate={isDrawer ? { x: 0 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isDrawer ? { x: "100%" } : { opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              className={cn(
                "glass-card w-full flex flex-col overflow-hidden relative border border-border shadow-2xl rounded-2xl max-h-[90vh] pointer-events-auto my-auto",
                isDrawer ? "h-full rounded-r-none border-l border-y-0 max-h-full" : sizes[size],
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between p-6 pb-4 border-b border-border/40">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
                  {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 rounded-full border border-border/40 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content body */}
              <div className="flex-1 overflow-y-auto p-6">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default Modal;
