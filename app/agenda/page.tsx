"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/DashboardWidgets';
import { db } from '../../services/db';
import { 
  Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, LayoutList, 
  CalendarDays, CalendarRange, Clock, Lock, Unlock, AlertTriangle 
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// We will import these components shortly
import DayView from '../../components/agenda/DayView';
import WeekView from '../../components/agenda/WeekView';
import MonthView from '../../components/agenda/MonthView';
import ListView from '../../components/agenda/ListView';
import AppointmentModal from '../../components/agenda/AppointmentModal';

export type ViewType = 'day' | 'week' | 'month' | 'list';

export default function AgendaPage() {
  const { toast } = useToast();
  const [company, setCompany] = useState<any>(null);
  const [isAgendaOpen, setIsAgendaOpen] = useState<boolean>(true);

  const [appointments, setAppointments] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  const [view, setView] = useState<ViewType>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [modalDefaultTime, setModalDefaultTime] = useState<{ date: Date, time: string, professionalId?: string } | null>(null);

  useEffect(() => {
    const c = db.getCurrentCompany();
    setCompany(c);
    if (c) {
      loadData(c.id);
      setIsAgendaOpen(db.getAgendaStatus(c.id));
    }
  }, []);

  const handleToggleAgendaStatus = () => {
    if (!company) return;
    const newStatus = !isAgendaOpen;
    setIsAgendaOpen(newStatus);
    db.setAgendaStatus(company.id, newStatus);

    if (newStatus) {
      toast('Agenda aberta com sucesso! Clientes já podem agendar normalmente no link público.', 'success', '🟢 Agenda Aberta');
    } else {
      toast('Agenda fechada com sucesso! Novos agendamentos online foram pausados.', 'warning', '🔴 Agenda Fechada');
    }
  };

  const loadData = (companyId: string) => {
    setAppointments(db.getAppointments(companyId));
    setProfessionals(db.getProfessionals(companyId));
    setServices(db.getServices(companyId));
    setClients(db.getClients(companyId));
  };

  const handlePrev = () => {
    if (view === 'day' || view === 'list') setSelectedDate(subDays(selectedDate, 1));
    else if (view === 'week') setSelectedDate(subDays(selectedDate, 7));
    else if (view === 'month') setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  const handleNext = () => {
    if (view === 'day' || view === 'list') setSelectedDate(addDays(selectedDate, 1));
    else if (view === 'week') setSelectedDate(addDays(selectedDate, 7));
    else if (view === 'month') setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleNewAppointmentClick = (date?: Date, time?: string, professionalId?: string) => {
    setSelectedAppointmentId(null);
    setModalDefaultTime(date && time ? { date, time, professionalId } : null);
    setIsModalOpen(true);
  };

  const handleEditAppointment = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setModalDefaultTime(null);
    setIsModalOpen(true);
  };

  const handleAppointmentSaved = () => {
    if (company) loadData(company.id);
    setIsModalOpen(false);
  };

  const getHeaderLabel = () => {
    if (view === 'day' || view === 'list') {
      return format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR });
    } else if (view === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, "d")} - ${format(end, "d 'de' MMMM", { locale: ptBR })}`;
      }
      return `${format(start, "d 'de' MMM", { locale: ptBR })} - ${format(end, "d 'de' MMM", { locale: ptBR })}`;
    } else if (view === 'month') {
      return format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
    return '';
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Agenda Online"
        description="Gerenciamento completo de horários e profissionais."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              onClick={handleToggleAgendaStatus} 
              variant={isAgendaOpen ? "outline" : "primary"}
              className={isAgendaOpen ? "text-red-400 border-red-500/40 hover:bg-red-500/10 font-bold text-xs" : "bg-green-500 hover:bg-green-600 text-black font-extrabold text-xs shadow-lg shadow-green-500/20"}
            >
              {isAgendaOpen ? (
                <>
                  <Lock className="w-3.5 h-3.5 mr-1.5" /> Fechar Agenda
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 mr-1.5" /> Abrir Agenda
                </>
              )}
            </Button>

            <Button onClick={() => handleNewAppointmentClick()} className="flex items-center gap-2 text-xs">
              <Plus className="w-4 h-4" /> Novo Agendamento
            </Button>
          </div>
        }
      />

      {/* Agenda Closed Warning Banner */}
      {!isAgendaOpen && (
        <div className="mb-6 p-4 rounded-2xl border border-red-500/40 bg-red-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none shadow-lg shadow-red-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <span className="font-extrabold text-red-400 block text-sm mb-0.5">🔴 Agenda Online Fechada no Momento</span>
              <span className="text-muted-foreground">Seus clientes não conseguirão realizar agendamentos online pelo link público até você reabrir a agenda.</span>
            </div>
          </div>
          <Button onClick={handleToggleAgendaStatus} className="bg-green-500 hover:bg-green-600 text-black font-extrabold text-xs shrink-0 w-full sm:w-auto">
            <Unlock className="w-3.5 h-3.5 mr-1" /> Reabrir Agenda Agora
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 rounded-xl border border-border/40 bg-card mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-lg border border-border/50">
            <button 
              onClick={() => setView('day')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${view === 'day' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
            >
              <Clock className="w-3.5 h-3.5" /> Dia
            </button>
            <button 
              onClick={() => setView('week')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${view === 'week' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Semana
            </button>
            <button 
              onClick={() => setView('month')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${view === 'month' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
            >
              <CalendarRange className="w-3.5 h-3.5" /> Mês
            </button>
            <button 
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${view === 'list' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
            >
              <LayoutList className="w-3.5 h-3.5" /> Lista
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrev} 
              className="p-2 border border-border/60 rounded-lg bg-secondary/40 hover:bg-secondary/80 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 font-bold text-sm text-foreground capitalize px-3 min-w-[200px] justify-center">
              <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
              {getHeaderLabel()}
            </div>
            <button 
              onClick={handleNext} 
              className="p-2 border border-border/60 rounded-lg bg-secondary/40 hover:bg-secondary/80 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={handleToday}
              className="ml-2 px-3 py-1.5 border border-border/60 bg-secondary/35 text-xs font-bold rounded-lg hover:bg-secondary/80 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
            >
              Hoje
            </button>
          </div>
        </div>
      </div>

      {/* Agenda Views */}
      <div className="bg-card rounded-xl border border-border/40 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
        {view === 'day' && (
          <DayView 
            date={selectedDate} 
            appointments={appointments} 
            professionals={professionals} 
            services={services}
            onSlotClick={handleNewAppointmentClick}
            onAppointmentClick={handleEditAppointment}
            onAppointmentsChanged={() => { if(company) loadData(company.id) }}
          />
        )}
        {view === 'week' && (
          <WeekView 
            date={selectedDate} 
            appointments={appointments} 
            professionals={professionals} 
            onAppointmentClick={handleEditAppointment}
          />
        )}
        {view === 'month' && (
          <MonthView 
            date={selectedDate} 
            appointments={appointments} 
            onAppointmentClick={handleEditAppointment}
            onDateClick={(date) => { setSelectedDate(date); setView('day'); }}
          />
        )}
        {view === 'list' && (
          <ListView 
            date={selectedDate} 
            appointments={appointments} 
            onAppointmentClick={handleEditAppointment}
          />
        )}
      </div>

      <AppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        appointmentId={selectedAppointmentId}
        defaultTime={modalDefaultTime}
        onSaved={handleAppointmentSaved}
        professionals={professionals}
        services={services}
        clients={clients}
        companyId={company?.id}
      />

    </DashboardLayout>
  );
}
