// components/ui/DashboardWidgets.tsx
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Card } from './Card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    type: 'up' | 'down';
    label?: string;
  };
  className?: string;
}

export const MetricCard = ({
  title,
  value,
  icon,
  trend,
  className
}: MetricCardProps) => {
  return (
    <Card hoverEffect className={cn("relative overflow-hidden p-6 border border-border/40", className)}>
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</span>
        <div className="p-2 border border-border bg-secondary/40 text-primary rounded-lg">
          {icon}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">{value}</h2>
        {trend && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className={cn(
              "flex items-center gap-0.5 font-bold",
              trend.type === 'up' ? "text-green-400" : "text-red-400"
            )}>
              {trend.type === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {trend.value}%
            </span>
            <span className="text-muted-foreground">{trend.label || 'vs. mês anterior'}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionText: string;
  onClick: () => void;
  className?: string;
}

export const ActionCard = ({
  title,
  description,
  icon,
  actionText,
  onClick,
  className
}: ActionCardProps) => {
  return (
    <Card className={cn("flex flex-col justify-between p-6 border border-border/40 hover:border-primary/30 transition-all", className)}>
      <div className="flex items-start gap-4 mb-5">
        <div className="p-3 border border-primary/20 bg-primary/5 text-primary rounded-xl shrink-0">
          {icon}
        </div>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-bold tracking-tight text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
      <button
        onClick={onClick}
        className="w-full py-2 px-4 rounded-lg bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-all border border-border/60 hover:border-primary cursor-pointer text-center"
      >
        {actionText}
      </button>
    </Card>
  );
};

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
}

export const PageHeader = ({
  title,
  description,
  actions,
  breadcrumbs,
  className
}: PageHeaderProps) => {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/40 mb-6", className)}>
      <div className="flex flex-col gap-1.5">
        {breadcrumbs && (
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">
            {breadcrumbs.map((b, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-[10px] text-muted-foreground/45">/</span>}
                <span className={cn(idx === breadcrumbs.length - 1 && "text-primary font-bold")}>{b.label}</span>
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
          {actions}
        </div>
      )}
    </div>
  );
};

export const SectionHeader = ({
  title,
  description,
  className
}: {
  title: string;
  description?: string;
  className?: string;
}) => (
  <div className={cn("mb-4 flex flex-col gap-0.5", className)}>
    <h3 className="text-lg font-bold tracking-tight text-foreground">{title}</h3>
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
  </div>
);
