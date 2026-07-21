"use client";

import React from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, format, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import Badge from '../ui/Badge';

interface MonthViewProps {
  date: Date;
  appointments: any[];
  onAppointmentClick: (appointmentId: string) => void;
  onDateClick: (date: Date) => void;
}

export default function MonthView({ date, appointments, onAppointmentClick, onDateClick }: MonthViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = "";

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      
      const dayApts = appointments.filter(apt => isSameDay(parseISO(apt.start_time), cloneDay));
      
      days.push(
        <div
          key={day.toISOString()}
          onClick={() => onDateClick(cloneDay)}
          className={cn(
            "min-h-[120px] p-2 border-r border-b border-border/40 hover:bg-secondary/10 transition-colors cursor-pointer flex flex-col gap-1",
            !isSameMonth(day, monthStart) ? "bg-secondary/5 opacity-50" : "bg-card",
            isSameDay(day, new Date()) && "bg-primary/5 font-bold"
          )}
        >
          <div className="flex justify-end">
            <span className={cn(
              "text-xs w-6 h-6 flex items-center justify-center rounded-full",
              isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : "text-muted-foreground font-medium"
            )}>
              {formattedDate}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto flex flex-col gap-1 no-scrollbar mt-1">
            {dayApts.slice(0, 3).map(apt => (
              <div 
                key={apt.id}
                onClick={(e) => { e.stopPropagation(); onAppointmentClick(apt.id); }}
                className="text-[9px] px-1.5 py-1 rounded bg-secondary/60 text-foreground truncate hover:bg-primary/20 hover:text-primary transition-colors border border-border/50"
              >
                <span className="font-bold mr-1">{format(parseISO(apt.start_time), 'HH:mm')}</span> 
                {apt.client?.name}
              </div>
            ))}
            {dayApts.length > 3 && (
              <div className="text-[9px] font-bold text-muted-foreground text-center mt-1">
                + {dayApts.length - 3} mais
              </div>
            )}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7" key={day.toISOString()}>
        {days}
      </div>
    );
    days = [];
  }

  const weekDaysLabel = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="grid grid-cols-7 border-b border-border/40 bg-secondary/10 sticky top-0 z-10">
        {weekDaysLabel.map((label, idx) => (
          <div key={idx} className="p-2 text-center text-xs font-bold text-muted-foreground uppercase border-r border-border/40 last:border-r-0">
            {label}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {rows}
      </div>
    </div>
  );
}
