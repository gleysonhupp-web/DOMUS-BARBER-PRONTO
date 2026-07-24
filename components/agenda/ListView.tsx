"use client";

import React from 'react';
import { format, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar } from '../ui/Avatar';
import Badge from '../ui/Badge';
import { formatCurrency } from '../../lib/utils';
import { Calendar, Clock, User, Scissors, MoreVertical } from 'lucide-react';
import Button from '../ui/Button';

interface ListViewProps {
  date: Date;
  appointments: any[];
  onAppointmentClick: (appointmentId: string) => void;
}

export default function ListView({ date, appointments, onAppointmentClick }: ListViewProps) {
  
  // Show appointments for the selected day and future (limit to next 50)
  const listApts = appointments
    .filter(a => parseISO(a.start_time) >= parseISO(date.toISOString().split('T')[0] + 'T00:00:00Z'))
    .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())
    .slice(0, 50);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'success';
      case 'confirmed': return 'info';
      case 'in_service': return 'default';
      case 'cancelled': return 'destructive';
      case 'no_show': return 'secondary';
      default: return 'warning';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'completed': return 'Finalizado';
      case 'confirmed': return 'Confirmado';
      case 'in_service': return 'Em Andamento';
      case 'cancelled': return 'Cancelado';
      case 'no_show': return 'Faltou';
      default: return 'Agendado';
    }
  };

  if (listApts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-muted-foreground gap-4">
        <Calendar className="w-12 h-12 opacity-20" />
        <p>Nenhum agendamento encontrado a partir desta data.</p>
      </div>
    );
  }

  // Group by day
  const grouped: Record<string, any[]> = {};
  listApts.forEach(apt => {
    const day = apt.start_time.split('T')[0];
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(apt);
  });

  return (
    <div className="flex flex-col h-full bg-card overflow-y-auto p-4 md:p-6 gap-8">
      {Object.entries(grouped).map(([dayStr, apts]) => (
        <div key={dayStr} className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/40 pb-2">
            <Calendar className="w-4 h-4 text-primary" />
            {format(parseISO(dayStr), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h3>
          
          <div className="flex flex-col gap-3">
            {apts.map(apt => {
              const aptDate = parseISO(apt.start_time);
              return (
                <div 
                  key={apt.id} 
                  onClick={() => onAppointmentClick(apt.id)}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-secondary/10 hover:bg-secondary/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-6">
                    {/* Time */}
                    <div className="flex flex-col items-center justify-center min-w-[60px]">
                      <span className="text-xl font-extrabold text-primary">{format(aptDate, 'HH:mm')}</span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{apt.service?.duration_minutes} min</span>
                    </div>
                    
                    {/* Divider */}
                    <div className="w-px h-10 bg-border/50 hidden md:block"></div>
                    
                    {/* Info */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground">{apt.client?.name}</span>
                        <Badge variant={getStatusColor(apt.status) as any} className="text-[10px] h-5 px-1.5">{getStatusLabel(apt.status)}</Badge>
                        {apt.payment_method && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            {apt.payment_method === 'credit_card' && '💳 Cartão de crédito'}
                            {apt.payment_method === 'debit_card' && '💳 Cartão de débito'}
                            {apt.payment_method === 'pix' && '⚡ PIX'}
                            {apt.payment_method === 'cash' && '💵 Dinheiro'}
                            {apt.payment_method === 'subscription' && '⭐ Assinatura'}
                            {apt.payment_method === 'unpaid' && '❌ Não pago'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Scissors className="w-3.5 h-3.5" /> {apt.service?.name}</span>
                        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {apt.professional?.name}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Price & Action */}
                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-border/40 pt-3 md:pt-0">
                    <span className="font-extrabold text-foreground">{formatCurrency(apt.total_price || apt.service?.price || 0)}</span>
                    <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      Detalhes
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
