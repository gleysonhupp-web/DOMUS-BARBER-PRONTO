// components/ui/Avatar.tsx
"use client";

import React, { useState } from 'react';
import { cn } from '../../lib/utils';

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar = ({
  src,
  name,
  size = 'md',
  className
}: AvatarProps) => {
  const [error, setError] = useState(false);

  const getInitials = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const sizes = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg"
  };

  const initials = getInitials(name);

  return (
    <div className={cn(
      "relative flex shrink-0 overflow-hidden rounded-full border border-border/60 bg-secondary items-center justify-center font-bold select-none text-muted-foreground",
      sizes[size],
      className
    )}>
      {src && !error ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          onError={() => setError(true)}
          className="aspect-square h-full w-full object-cover"
        />
      ) : (
        <span className="text-primary font-semibold tracking-wider">{initials}</span>
      )}
    </div>
  );
};
export default Avatar;
