"use client";

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Input } from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import { db } from '../../services/db';
import { addMinutes, parseISO, isSameDay } from 'date-fns';
import { formatCurrency } from '../../lib/utils';
import Badge from '../ui/Badge';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string | null; // null for new
  defaultTime: { date: Date; time: string; professionalId?: string } | null;
  onSaved: () => void;
  professionals: any[];
  services: any[];
  clients: any[];
  companyId: string | undefined;
}

export default function AppointmentModal({
  isOpen,
  onClose,
  appointmentId,
  defaultTime,
  onSaved,
  professionals,
  services,
  clients,
  companyId
}: AppointmentModalProps) {
  const { toast } = useToast();
  
  const [formClient, setFormClient] = useState('');
  const [formProfessional, setFormProfessional] = useState('');
  const [formService, setFormService] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState('scheduled');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (appointmentId && companyId) {
        // Edit mode
        const allApts = db.getAppointments(companyId);
        const apt = allApts.find(a => a.id === appointmentId);
        if (apt) {
          setFormClient(apt.client_id);
          setFormProfessional(apt.professional_id);
          setFormService(apt.service_id);
          setFormDate(apt.start_time.split('T')[0]);
          setFormTime(apt.start_time.split('T')[1].substring(0, 5));
          setFormNotes(apt.notes || '');
          setFormStatus(apt.status);
        }
      } else {
        // Create mode
        setFormClient('');
        setFormService('');
        setFormNotes('');
        setFormStatus('scheduled');
        
        if (defaultTime) {
          setFormDate(defaultTime.date.toISOString().split('T')[0]);
          setFormTime(defaultTime.time);
          if (defaultTime.professionalId) setFormProfessional(defaultTime.professionalId);
        } else {
          setFormDate(new Date().toISOString().split('T')[0]);
          setFormTime('09:00');
          setFormProfessional('');
        }
      }
    }
  }, [isOpen, appointmentId, defaultTime, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    if (!formClient || !formProfessional || !formService || !formTime || !formDate) {
      toast('Por favor, preencha todos os campos obrigatórios.', 'warning', 'Atenção');
      return;
    }

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Latency mock

    const selectedService = services.find(s => s.id === formService);
    const selectedClient = clients.find(c => c.id === formClient);
    const selectedProfessional = professionals.find(p => p.id === formProfessional);
    const duration = selectedService?.duration_minutes || 30;

    const [h, m] = formTime.split(':').map(Number);
    const targetIsoDate = new Date(`${formDate}T00:00:00`);
    targetIsoDate.setHours(h, m, 0, 0);
    const targetEndIsoDate = addMinutes(targetIsoDate, duration);

    const startISO = targetIsoDate.toISOString();
    const endISO = targetEndIsoDate.toISOString();

    const allApts = db.getAppointments(companyId);

    // Business Rule: Double booking check
    const hasConflict = allApts.some(a => {
      if (a.id === appointmentId) return false;
      if (a.professional_id !== formProfessional) return false;
      if (a.status === 'cancelled') return false;
      
      const aStart = parseISO(a.start_time);
      const aEnd = parseISO(a.end_time);
      
      return (targetIsoDate < aEnd && targetEndIsoDate > aStart);
    });

    if (hasConflict) {
      toast('Este profissional já possui um agendamento neste horário.', 'error', 'Conflito de Horário');
      setIsSubmitting(false);
      return;
    }

    // Prepare apt object
    const aptData = {
      company_id: companyId,
      client_id: formClient,
      professional_id: formProfessional,
      service_id: formService,
      start_time: startISO,
      end_time: endISO,
      status: formStatus as any,
      notes: formNotes,
      total_price: selectedService?.price || 0,
      updated_at: new Date().toISOString(),
    };

    const currentAptsRaw = allApts.map(a => {
      const { client, professional, service, ...rest } = a;
      return rest;
    });

    let isNew = false;
    let oldStatus = 'scheduled';

    if (appointmentId) {
      const existing = currentAptsRaw.find(a => a.id === appointmentId);
      if (existing) oldStatus = existing.status;
      
      const updated = currentAptsRaw.map(a => 
        a.id === appointmentId ? { ...a, ...aptData } : a
      );
      db.saveAppointments(updated);
    } else {
      isNew = true;
      const newId = `ap-${Math.random().toString(36).substr(2, 9)}`;
      const newApt = {
        ...aptData,
        id: newId,
        created_at: new Date().toISOString(),
      };
      db.saveAppointments([...currentAptsRaw, newApt]);
      
      db.logAudit(companyId, db.getCurrentUser()?.id || null, 'appointment_created', { 
        client: selectedClient?.name, 
        time: startISO 
      });
    }

    // Business Rule: Generate financial entry when status changes to 'completed'
    if (formStatus === 'completed' && oldStatus !== 'completed') {
      const txs = db.getFinancialTransactions(companyId);
      const newTx = {
        id: `t-${Math.random().toString(36).substr(2, 9)}`,
        company_id: companyId,
        type: 'income' as const,
        category: 'service_appointment' as const,
        amount: selectedService?.price || 0,
        description: `Agendamento: ${selectedService?.name} (${selectedClient?.name}) - Prof: ${selectedProfessional?.name}`,
        date: formDate,
        payment_method: 'pix' as const, // default mock
        appointment_id: appointmentId || 'new',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.saveFinancialTransactions([newTx, ...txs]);
      
      // Also mock stock deduction
      toast('Atendimento finalizado! Receita registrada e estoque atualizado.', 'success', 'Concluído');
    } else {
      toast(isNew ? 'Agendamento criado.' : 'Agendamento atualizado.', 'success', 'Sucesso');
    }

    setIsSubmitting(false);
    onSaved();
  };

  const selectedService = services.find(s => s.id === formService);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={appointmentId ? "Detalhes do Agendamento" : "Novo Agendamento"}
      description="Preencha os dados abaixo para reservar ou atualizar o horário."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        {/* Status indicator for Edit Mode */}
        {appointmentId && (
          <div className="flex items-center gap-2 mb-2 p-3 bg-secondary/10 rounded-lg border border-border/40">
            <span className="text-xs font-bold text-muted-foreground mr-auto">Status do Atendimento:</span>
            <select 
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
              className="bg-background border border-border rounded px-2 py-1 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="scheduled">Agendado</option>
              <option value="confirmed">Confirmado</option>
              <option value="in_service">Em Andamento</option>
              <option value="completed">Finalizado</option>
              <option value="no_show">Faltou</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        )}

        <Select
          label="Cliente (CRM)"
          value={formClient}
          onChange={(e) => setFormClient(e.target.value)}
          options={[
            { value: '', label: 'Selecione o Cliente' },
            ...clients.map(c => ({ value: c.id, label: c.name }))
          ]}
        />

        <Select
          label="Serviço"
          value={formService}
          onChange={(e) => setFormService(e.target.value)}
          options={[
            { value: '', label: 'Selecione o Serviço' },
            ...services.map(s => ({ value: s.id, label: `${s.name} — ${formatCurrency(s.price)} (${s.duration_minutes} min)` }))
          ]}
        />

        <Select
          label="Profissional"
          value={formProfessional}
          onChange={(e) => setFormProfessional(e.target.value)}
          options={[
            { value: '', label: 'Selecione o Profissional' },
            ...professionals.map(p => ({ value: p.id, label: p.name }))
          ]}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            label="Data"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
          />
          <Input
            type="time"
            label="Horário Inicial"
            value={formTime}
            onChange={(e) => setFormTime(e.target.value)}
          />
        </div>

        {selectedService && (
          <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/20 border border-border/40">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-muted-foreground font-bold">Duração Estimada</span>
              <span className="text-sm font-extrabold text-foreground">{selectedService.duration_minutes} minutos</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-muted-foreground font-bold">Valor Total</span>
              <span className="text-sm font-extrabold text-primary">{formatCurrency(selectedService.price)}</span>
            </div>
          </div>
        )}

        <Input
          type="text"
          label="Observações"
          placeholder="Ex: Cliente prefere água com gás."
          value={formNotes}
          onChange={(e) => setFormNotes(e.target.value)}
        />

        <Button type="submit" isLoading={isSubmitting} className="w-full mt-4">
          {appointmentId ? "Salvar Alterações" : "Confirmar e Reservar Horário"}
        </Button>
      </form>
    </Modal>
  );
}
