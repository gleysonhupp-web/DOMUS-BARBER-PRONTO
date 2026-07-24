"use client";

import React, { useState } from 'react';
import { format, isSameDay, addMinutes, parseISO, startOfDay } from 'date-fns';
import { Clock } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { cn, formatCurrency } from '../../lib/utils';
import { DndContext, useDraggable, useDroppable, DragEndEvent, pointerWithin } from '@dnd-kit/core';
import { db } from '../../services/db';
import { useToast } from '../ui/Toast';

interface DayViewProps {
  date: Date;
  appointments: any[];
  professionals: any[];
  services: any[];
  onSlotClick: (date: Date, time: string, professionalId: string) => void;
  onAppointmentClick: (appointmentId: string) => void;
  onAppointmentsChanged: () => void;
}

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
];

// Helper to convert HH:MM to minutes since midnight for positioning
const getMinutesFromTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const getMinutesFromISO = (isoString: string) => {
  const d = new Date(isoString);
  return d.getHours() * 60 + d.getMinutes();
};

export default function DayView({ 
  date, 
  appointments, 
  professionals, 
  services,
  onSlotClick, 
  onAppointmentClick,
  onAppointmentsChanged
}: DayViewProps) {
  const { toast } = useToast();
  
  // Filter appointments for the selected day
  const dailyAppointments = appointments.filter(apt => isSameDay(parseISO(apt.start_time), date));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const appointmentId = active.id as string;
    const dropData = over.data.current as { professionalId: string, time: string };
    
    if (!dropData) return;

    const apt = dailyAppointments.find(a => a.id === appointmentId);
    if (!apt) return;

    // Check if dragging to same slot
    const currentStartH = parseISO(apt.start_time).getHours();
    const currentStartM = parseISO(apt.start_time).getMinutes();
    const [targetH, targetM] = dropData.time.split(':').map(Number);
    
    if (apt.professional_id === dropData.professionalId && 
        currentStartH === targetH && currentStartM === targetM) {
      return; // No change
    }

    // Double booking check (simplified for mock, ideal is checking overlap)
    const targetIsoDate = new Date(date);
    targetIsoDate.setHours(targetH, targetM, 0, 0);
    const service = services.find(s => s.id === apt.service_id);
    const duration = service?.duration_minutes || 30;
    const targetEndIsoDate = addMinutes(targetIsoDate, duration);

    const hasConflict = dailyAppointments.some(a => {
      if (a.id === appointmentId) return false;
      if (a.professional_id !== dropData.professionalId) return false;
      if (a.status === 'cancelled') return false;
      
      const aStart = parseISO(a.start_time);
      const aEnd = parseISO(a.end_time);
      
      return (targetIsoDate < aEnd && targetEndIsoDate > aStart);
    });

    if (hasConflict) {
      toast('Horário indisponível ou em conflito para este profissional.', 'error', 'Erro');
      return;
    }

    // Update locally in DB
    const company = db.getCurrentCompany();
    if (!company) return;

    const allApts = db.getAppointments(company.id);
    const rawApts = allApts.map(a => {
      const { client, professional, service, ...rest } = a;
      if (rest.id === appointmentId) {
        return {
          ...rest,
          professional_id: dropData.professionalId,
          start_time: targetIsoDate.toISOString(),
          end_time: targetEndIsoDate.toISOString()
        };
      }
      return rest;
    });

    db.saveAppointments(rawApts);
    toast('Agendamento reagendado com sucesso.', 'success', 'Sucesso');
    onAppointmentsChanged();
  };

  if (professionals.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">Nenhum profissional cadastrado.</div>;
  }

  // Cell Height for 30min block
  const cellHeight = 60; // 60px per 30 mins

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
      <div className="flex flex-col h-full overflow-hidden bg-card">
        {/* Header Row */}
        <div className="flex border-b border-border/40 bg-secondary/10 sticky top-0 z-20">
          <div className="w-20 shrink-0 border-r border-border/40 bg-secondary/20 flex flex-col items-center justify-center text-xs font-bold text-muted-foreground">
            Horário
          </div>
          <div className="flex-1 flex">
            {professionals.map(prof => (
              <div key={prof.id} className="flex-1 min-w-[150px] p-3 text-center flex flex-col items-center justify-center gap-1.5 border-r border-border/40 last:border-r-0">
                <Avatar src={prof.avatar_url} name={prof.name} size="sm" />
                <span className="text-xs font-extrabold text-foreground truncate max-w-[120px]">{prof.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grid Area */}
        <div className="flex-1 overflow-y-auto relative" style={{ maxHeight: 'calc(100vh - 250px)' }}>
          <div className="flex min-w-max w-full">
            
            {/* Time Column */}
            <div className="w-20 shrink-0 border-r border-border/40 bg-secondary/5 flex flex-col">
              {TIME_SLOTS.map((time) => (
                <div key={time} style={{ height: cellHeight }} className="flex items-start justify-center p-2 border-b border-border/20 relative">
                  <span className="text-[10px] font-bold text-muted-foreground bg-card px-1 relative -top-3 flex items-center gap-1">
                    {time.endsWith('00') && <Clock className="w-3 h-3 text-primary/50" />} {time}
                  </span>
                </div>
              ))}
            </div>

            {/* Professionals Columns */}
            <div className="flex-1 flex relative">
              {professionals.map(prof => (
                <div key={prof.id} className="flex-1 min-w-[150px] border-r border-border/40 last:border-r-0 relative">
                  {/* Background Slots for Dropping & Clicking */}
                  {TIME_SLOTS.map(time => (
                    <DroppableSlot 
                      key={`${prof.id}-${time}`} 
                      id={`${prof.id}-${time}`} 
                      professionalId={prof.id} 
                      time={time} 
                      date={date}
                      height={cellHeight}
                      onClick={() => onSlotClick(date, time, prof.id)}
                    />
                  ))}

                  {/* Render Appointments Absolute Positioned */}
                  {dailyAppointments
                    .filter(a => a.professional_id === prof.id)
                    .map(apt => {
                      const startMins = getMinutesFromISO(apt.start_time);
                      const endMins = getMinutesFromISO(apt.end_time);
                      const duration = endMins - startMins;
                      
                      const dayStartMins = getMinutesFromTime(TIME_SLOTS[0]); // 8:00 = 480
                      
                      // Only render if it falls within our timeline bounds
                      if (startMins < dayStartMins) return null;

                      const top = ((startMins - dayStartMins) / 30) * cellHeight;
                      const height = (duration / 30) * cellHeight;

                      return (
                        <DraggableAppointment 
                          key={apt.id}
                          appointment={apt}
                          top={top}
                          height={height}
                          onClick={() => onAppointmentClick(apt.id)}
                        />
                      );
                  })}
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </DndContext>
  );
}

// Droppable Slot Component
function DroppableSlot({ id, professionalId, time, date, height, onClick }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: { professionalId, time, date }
  });

  return (
    <div 
      ref={setNodeRef}
      style={{ height }}
      onClick={onClick}
      className={cn(
        "border-b border-border/20 w-full transition-colors cursor-pointer flex items-center justify-center group",
        isOver ? "bg-primary/20 border-primary border-dashed" : "hover:bg-primary/5"
      )}
    >
      <span className="opacity-0 group-hover:opacity-100 text-[10px] text-primary/40 font-bold transition-opacity">
        +
      </span>
    </div>
  );
}

// Draggable Appointment Card
function DraggableAppointment({ appointment, top, height, onClick }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment }
  });

  const style = {
    position: 'absolute' as const,
    top: `${top}px`,
    height: `${height}px`,
    left: '4px',
    right: '4px',
    zIndex: isDragging ? 50 : 10,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  const statusStyles = {
    scheduled: "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20",
    confirmed: "bg-blue-500/10 border-blue-500/30 text-blue-500 hover:bg-blue-500/20",
    in_service: "bg-primary/10 border-primary/40 text-primary hover:bg-primary/20",
    completed: "bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20",
    cancelled: "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20 line-through opacity-60",
    no_show: "bg-zinc-500/10 border-zinc-500/30 text-zinc-500 hover:bg-zinc-500/20"
  };

  const statusLabel = {
    scheduled: "Agendado",
    confirmed: "Confirmado",
    in_service: "Em Andamento",
    completed: "Finalizado",
    cancelled: "Cancelado",
    no_show: "Faltou"
  };

  const currentStyle = statusStyles[appointment.status as keyof typeof statusStyles] || statusStyles.scheduled;
  const currentLabel = statusLabel[appointment.status as keyof typeof statusLabel] || "Agendado";

  const paymentLabels: Record<string, string> = {
    credit_card: '💳 Crédito',
    debit_card: '💳 Débito',
    pix: '⚡ PIX',
    cash: '💵 Dinheiro',
    subscription: '⭐ Assinatura',
    unpaid: '❌ Não pago'
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md border p-1.5 shadow-sm transition-shadow overflow-hidden flex flex-col justify-between select-none cursor-grab active:cursor-grabbing",
        currentStyle,
        isDragging && "shadow-xl opacity-90 border-dashed"
      )}
      {...listeners}
      {...attributes}
      onDoubleClick={(e) => { e.stopPropagation(); onClick(); }} // double click to edit to not interfere with drag
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-bold leading-tight truncate">{appointment.client?.name}</span>
          {appointment.payment_method && (
            <span className="text-[8px] font-black px-1 rounded bg-black/40 text-amber-300 shrink-0">
              {paymentLabels[appointment.payment_method] || appointment.payment_method}
            </span>
          )}
        </div>
        <span className="text-[9px] opacity-80 leading-tight truncate">{appointment.service?.name}</span>
      </div>
      
      {height >= 50 && ( // Only show status and price if block is tall enough
        <div className="flex items-center justify-between mt-auto">
          <span className="text-[8px] font-bold px-1 py-0.5 rounded-sm bg-background/50 backdrop-blur-sm">
            {currentLabel}
          </span>
          <span className="text-[9px] font-extrabold font-mono">
            {formatCurrency(appointment.total_price || appointment.service?.price || 0)}
          </span>
        </div>
      )}
    </div>
  );
}
