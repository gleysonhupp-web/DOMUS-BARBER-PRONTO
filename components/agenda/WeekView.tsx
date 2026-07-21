"use client";

import React from 'react';
import { startOfWeek, addDays, format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatCurrency } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';

interface WeekViewProps {
  date: Date;
  appointments: any[];
  professionals: any[];
  onAppointmentClick: (appointmentId: string) => void;
}

export default function WeekView({ date, appointments, professionals, onAppointmentClick }: WeekViewProps) {
  const startDate = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
  
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  // Get appointments for the week
  const weekAppointments = appointments.filter(apt => {
    const aptDate = parseISO(apt.start_time);
    return aptDate >= startDate && aptDate <= addDays(startDate, 7);
  });

  if (professionals.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">Nenhum profissional cadastrado.</div>;
  }

  // To simplify Week View, we'll show a simplified list per day
  return (
    <div className="flex flex-col h-full bg-card overflow-auto">
      <div className="grid grid-cols-7 border-b border-border/40 bg-secondary/10 sticky top-0 z-10">
        {weekDays.map(day => (
          <div key={day.toISOString()} className={cn(
            "p-3 text-center border-r border-border/40 last:border-r-0 flex flex-col gap-1",
            isSameDay(day, new Date()) && "bg-primary/5"
          )}>
            <span className="text-xs font-bold text-muted-foreground uppercase">{format(day, 'EEE', { locale: ptBR })}</span>
            <span className={cn(
              "text-lg font-extrabold", 
              isSameDay(day, new Date()) ? "text-primary" : "text-foreground"
            )}>
              {format(day, 'dd')}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 min-h-[500px]">
        {weekDays.map(day => {
          const dayApts = weekAppointments
            .filter(apt => isSameDay(parseISO(apt.start_time), day))
            .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());

          return (
            <div key={day.toISOString()} className={cn(
              "p-2 border-r border-border/40 last:border-r-0 flex flex-col gap-2 relative",
              isSameDay(day, new Date()) && "bg-primary/5"
            )}>
              {dayApts.length === 0 && (
                <div className="text-center text-xs text-muted-foreground/30 mt-4 font-medium">Livre</div>
              )}
              {dayApts.map(apt => {
                const prof = professionals.find(p => p.id === apt.professional_id);
                const aptDate = parseISO(apt.start_time);
                
                return (
                  <div 
                    key={apt.id}
                    onClick={() => onAppointmentClick(apt.id)}
                    className="p-2 rounded-lg border border-border/50 bg-background shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-primary">{format(aptDate, 'HH:mm')}</span>
                      <Avatar src={prof?.avatar_url} name={prof?.name} size="xs" />
                    </div>
                    <div className="text-[11px] font-bold text-foreground truncate">{apt.client?.name}</div>
                    <div className="text-[9px] text-muted-foreground truncate">{apt.service?.name}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
