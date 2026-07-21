// components/ui/DataTable.tsx
"use client";

import React from 'react';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import Input from './Input';
import { LoadingSkeleton, EmptyState } from './Feedback';

export interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  isLoading = false,
  emptyTitle = "Nenhum dado encontrado",
  emptyDescription = "Crie um novo registro para começar.",
  onRowClick,
  className
}: DataTableProps<T>) {
  if (isLoading) {
    return <LoadingSkeleton variant="list" count={5} />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn("w-full overflow-hidden rounded-xl border border-border/40 bg-card/50 backdrop-blur-md", className)}>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/40 bg-secondary/35">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={cn(
                    "px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {data.map((item, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => onRowClick && onRowClick(item)}
                className={cn(
                  "hover:bg-secondary/20 transition-colors",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className={cn(
                      "px-6 py-4 text-sm text-foreground align-middle font-medium",
                      col.className
                    )}
                  >
                    {col.accessor(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer Mockup */}
      <div className="px-6 py-3 border-t border-border/40 bg-secondary/15 flex items-center justify-between text-xs text-muted-foreground">
        <span>Mostrando {data.length} registros</span>
        <div className="flex items-center gap-2">
          <button disabled className="p-1 border border-border rounded bg-secondary/40 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button disabled className="p-1 border border-border rounded bg-secondary/40 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar = ({
  value,
  onChange,
  placeholder = "Buscar...",
  className
}: SearchBarProps) => {
  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      icon={<Search className="w-4 h-4 text-muted-foreground/60" />}
      className={cn("bg-secondary/70 max-w-sm", className)}
    />
  );
};

export interface FilterBarProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export const FilterBar = ({
  value,
  onChange,
  options,
  className
}: FilterBarProps) => {
  return (
    <div className={cn("relative flex items-center max-w-xs w-full bg-secondary/70 border border-border/80 rounded-lg px-3.5 py-2.5", className)}>
      <Filter className="w-4 h-4 text-muted-foreground/60 mr-2.5" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm text-foreground outline-none appearance-none cursor-pointer pr-5 font-medium"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-card text-foreground">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
export default DataTable;
