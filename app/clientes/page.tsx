// app/clientes/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/DashboardWidgets';
import Modal from '../../components/ui/Modal';
import { Input, Textarea } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';
import { db } from '../../services/db';
import { formatCurrency } from '../../lib/utils';
import {
  Plus, Search, Phone, Mail, Star, Calendar, TrendingUp,
  User, MessageSquare, Crown, Clock, FileText, X, ChevronRight,
  Users, AlertCircle, Gift, ShoppingBag
} from 'lucide-react';
import {
  format, differenceInDays, parseISO, isSameMonth, subDays, startOfMonth
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Client, Appointment } from '../../types';

type CRMFilter =
  | 'todos'
  | 'vip'
  | 'novos'
  | 'recorrentes'
  | 'inativos_30'
  | 'inativos_60'
  | 'aniversariantes'
  | 'cancelamentos';

const CRM_FILTERS: { key: CRMFilter; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'todos', label: 'Todos', icon: <Users className="w-3.5 h-3.5" />, color: 'text-foreground border-border' },
  { key: 'vip', label: 'VIP', icon: <Crown className="w-3.5 h-3.5" />, color: 'text-amber-400 border-amber-500/40' },
  { key: 'novos', label: 'Novos', icon: <Star className="w-3.5 h-3.5" />, color: 'text-green-400 border-green-500/40' },
  { key: 'recorrentes', label: 'Recorrentes', icon: <TrendingUp className="w-3.5 h-3.5" />, color: 'text-blue-400 border-blue-500/40' },
  { key: 'inativos_30', label: 'Inativos 30d', icon: <Clock className="w-3.5 h-3.5" />, color: 'text-orange-400 border-orange-500/40' },
  { key: 'inativos_60', label: 'Inativos 60d', icon: <AlertCircle className="w-3.5 h-3.5" />, color: 'text-red-400 border-red-500/40' },
  { key: 'aniversariantes', label: 'Aniversariantes', icon: <Gift className="w-3.5 h-3.5" />, color: 'text-pink-400 border-pink-500/40' },
  { key: 'cancelamentos', label: 'Cancelamentos', icon: <X className="w-3.5 h-3.5" />, color: 'text-red-400 border-red-500/40' },
];

interface ClientWithMetrics extends Client {
  totalSpent: number;
  totalVisits: number;
  lastVisit: string | null;
  cancelledCount: number;
  isVip: boolean;
  isNew: boolean;
  isRecurrent: boolean;
  isInactive30: boolean;
  isInactive60: boolean;
  isBirthdayThisMonth: boolean;
  appointments: Appointment[];
}

export default function ClientesPage() {
  const { toast } = useToast();
  const company = db.getCurrentCompany();

  const [clients, setClients] = useState<ClientWithMetrics[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<CRMFilter>('todos');
  const [selectedClient, setSelectedClient] = useState<ClientWithMetrics | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'dados' | 'historico' | 'metricas'>('dados');

  // New client form
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDoc, setFormDoc] = useState('');
  const [formBirth, setFormBirth] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const companyId = company?.id;

  const loadData = useCallback(() => {
    if (!companyId) return;
    const rawClients = db.getClients(companyId);
    const allAppts = db.getAppointments(companyId);
    const now = new Date();
    const currentMonth = now.getMonth();

    const enriched: ClientWithMetrics[] = rawClients.map((client) => {
      const clientAppts = allAppts.filter((a) => a.client_id === client.id);
      const completedAppts = clientAppts.filter((a) => a.status === 'completed');
      const cancelledCount = clientAppts.filter((a) => a.status === 'cancelled').length;
      const totalSpent = completedAppts.reduce((sum, a) => sum + a.total_price, 0);
      const totalVisits = completedAppts.length;

      const sortedCompleted = [...completedAppts].sort(
        (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );
      const lastVisit = sortedCompleted[0]?.start_time ?? null;

      const daysSinceLast = lastVisit
        ? differenceInDays(now, parseISO(lastVisit))
        : 9999;

      const daysSinceCreated = differenceInDays(now, parseISO(client.created_at));

      const isBirthdayThisMonth = !!client.birth_date &&
        new Date(client.birth_date).getMonth() === currentMonth;

      const isVip = !!(client.notes?.toLowerCase().includes('vip')) || totalSpent > 300;

      return {
        ...client,
        totalSpent,
        totalVisits,
        lastVisit,
        cancelledCount,
        isVip,
        isNew: daysSinceCreated <= 30,
        isRecurrent: totalVisits >= 3,
        isInactive30: daysSinceLast >= 30 && totalVisits > 0,
        isInactive60: daysSinceLast >= 60 && totalVisits > 0,
        isBirthdayThisMonth,
        appointments: clientAppts,
      };
    });

    setClients(enriched);
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredClients = useMemo(() => {
    let list = clients;

    // CRM Filter
    switch (activeFilter) {
      case 'vip': list = list.filter((c) => c.isVip); break;
      case 'novos': list = list.filter((c) => c.isNew); break;
      case 'recorrentes': list = list.filter((c) => c.isRecurrent); break;
      case 'inativos_30': list = list.filter((c) => c.isInactive30); break;
      case 'inativos_60': list = list.filter((c) => c.isInactive60); break;
      case 'aniversariantes': list = list.filter((c) => c.isBirthdayThisMonth); break;
      case 'cancelamentos': list = list.filter((c) => c.cancelledCount > 0); break;
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.email?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [clients, activeFilter, search]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!formName || !formPhone) {
      toast('Nome e WhatsApp são obrigatórios.', 'warning', 'Atenção');
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));

    const newClient: Client = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: company.id,
      name: formName,
      email: formEmail || null,
      phone: formPhone.replace(/\D/g, ''),
      document: formDoc || null,
      birth_date: formBirth || null,
      notes: formNotes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.addClient(newClient);
    db.logAudit(company.id, db.getCurrentUser()?.id ?? null, 'client_created', { name: formName });
    loadData();

    setIsSubmitting(false);
    setIsAddOpen(false);
    setFormName(''); setFormPhone(''); setFormEmail('');
    setFormDoc(''); setFormBirth(''); setFormNotes('');
    toast('Cliente adicionado ao CRM!', 'success', 'Sucesso');
  };

  const handleWhatsApp = (phone?: string | null) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${clean}`, '_blank');
  };

  const openDetail = (client: ClientWithMetrics) => {
    setSelectedClient(client);
    setDetailTab('dados');
    setIsDetailOpen(true);
  };

  const STATUS_LABELS: Record<string, string> = {
    scheduled: 'Agendado', confirmed: 'Confirmado',
    completed: 'Finalizado', cancelled: 'Cancelado', no_show: 'Faltou',
  };
  const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'outline' | 'primary'> = {
    scheduled: 'outline', confirmed: 'primary',
    completed: 'success', cancelled: 'error', no_show: 'warning',
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Clientes & CRM"
        description="Gerencie seus clientes, acompanhe histórico e inteligência de relacionamento."
        actions={
          <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo Cliente
          </Button>
        }
      />

      {/* CRM Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-1 px-1 scrollbar-hide">
        {CRM_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              activeFilter === f.key
                ? 'bg-primary/10 border-primary text-primary'
                : `bg-secondary/30 ${f.color} hover:bg-secondary/60`
            }`}
          >
            {f.icon}
            {f.label}
            {activeFilter === f.key && filteredClients.length > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {filteredClients.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, telefone ou e-mail..."
          className="w-full pl-9 pr-4 py-2.5 bg-secondary/30 border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Client Cards Grid */}
      {filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-muted-foreground/20 mb-4" />
          <h3 className="font-bold text-foreground mb-1">Nenhum cliente encontrado</h3>
          <p className="text-sm text-muted-foreground">
            {search ? 'Tente outra busca.' : 'Adicione clientes ao CRM para começar.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className="border border-border/40 hover:border-primary/30 transition-all cursor-pointer group"
              hoverEffect
              onClick={() => openDetail(client)}
            >
              <CardContent className="p-5">
                {/* Header row */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-foreground text-sm truncate">{client.name}</h3>
                      {client.isVip && (
                        <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {client.isVip && <Badge variant="warning" className="text-[9px] py-0 px-1.5">VIP</Badge>}
                      {client.isNew && <Badge variant="success" className="text-[9px] py-0 px-1.5">Novo</Badge>}
                      {client.isRecurrent && <Badge variant="primary" className="text-[9px] py-0 px-1.5">Recorrente</Badge>}
                      {client.isInactive60 && <Badge variant="error" className="text-[9px] py-0 px-1.5">Inativo</Badge>}
                      {client.isBirthdayThisMonth && <Badge variant="outline" className="text-[9px] py-0 px-1.5">🎂 Aniversário</Badge>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                </div>

                {/* Info */}
                <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                  {client.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-primary/60" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-primary/60" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.lastVisit && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary/60" />
                      <span>Última visita: {format(parseISO(client.lastVisit), 'dd/MM/yyyy')}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-secondary/30 text-center">
                    <p className="text-xs text-muted-foreground">Visitas</p>
                    <p className="font-bold text-foreground">{client.totalVisits}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary/30 text-center">
                    <p className="text-xs text-muted-foreground">Total gasto</p>
                    <p className="font-bold text-primary text-xs">{formatCurrency(client.totalSpent)}</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleWhatsApp(client.phone)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>
                  <button
                    onClick={() => openDetail(client)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 transition-all"
                  >
                    <User className="w-3.5 h-3.5" />
                    Perfil
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Client Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedClient?.name ?? ''}
        description={selectedClient?.isVip ? '⭐ Cliente VIP' : 'Perfil do Cliente'}
      >
        {selectedClient && (
          <div className="flex flex-col gap-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-secondary/40 rounded-lg p-1">
              {(['dados', 'historico', 'metricas'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDetailTab(t)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${
                    detailTab === t
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t === 'dados' ? 'Dados' : t === 'historico' ? 'Histórico' : 'Métricas'}
                </button>
              ))}
            </div>

            {/* Dados Tab */}
            {detailTab === 'dados' && (
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Telefone', value: selectedClient.phone },
                  { label: 'Email', value: selectedClient.email },
                  { label: 'CPF', value: selectedClient.document },
                  { label: 'Nascimento', value: selectedClient.birth_date ? format(new Date(selectedClient.birth_date + 'T00:00:00'), 'dd/MM/yyyy') : null },
                ].map((row) => row.value ? (
                  <div key={row.label} className="flex justify-between items-start py-2 border-b border-border/30">
                    <span className="text-muted-foreground text-xs">{row.label}</span>
                    <span className="font-medium text-foreground text-xs text-right">{row.value}</span>
                  </div>
                ) : null)}
                {selectedClient.notes && (
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/40 text-xs text-muted-foreground leading-relaxed">
                    <span className="font-bold text-foreground block mb-1">Observações</span>
                    {selectedClient.notes}
                  </div>
                )}
              </div>
            )}

            {/* Histórico Tab */}
            {detailTab === 'historico' && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {selectedClient.appointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Sem agendamentos registrados.</div>
                ) : (
                  [...selectedClient.appointments]
                    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                    .map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/30 gap-2">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs font-semibold text-foreground truncate">{apt.service?.name ?? 'Serviço'}</span>
                          <span className="text-[10px] text-muted-foreground">{format(parseISO(apt.start_time), 'dd/MM/yyyy HH:mm')}</span>
                          <span className="text-[10px] text-muted-foreground">{apt.professional?.name ?? ''}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant={STATUS_VARIANT[apt.status] ?? 'outline'} className="text-[9px] py-0">
                            {STATUS_LABELS[apt.status] ?? apt.status}
                          </Badge>
                          <span className="text-xs font-bold text-primary">{formatCurrency(apt.total_price)}</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}

            {/* Métricas Tab */}
            {detailTab === 'metricas' && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total gasto', value: formatCurrency(selectedClient.totalSpent), icon: <ShoppingBag className="w-4 h-4 text-primary" /> },
                  { label: 'Total de visitas', value: String(selectedClient.totalVisits), icon: <Calendar className="w-4 h-4 text-primary" /> },
                  {
                    label: 'Ticket médio',
                    value: selectedClient.totalVisits > 0 ? formatCurrency(selectedClient.totalSpent / selectedClient.totalVisits) : 'R$ 0',
                    icon: <TrendingUp className="w-4 h-4 text-primary" />
                  },
                  {
                    label: 'Última visita',
                    value: selectedClient.lastVisit ? format(parseISO(selectedClient.lastVisit), 'dd/MM/yyyy') : 'Nunca',
                    icon: <Clock className="w-4 h-4 text-primary" />
                  },
                  { label: 'Cancelamentos', value: String(selectedClient.cancelledCount), icon: <X className="w-4 h-4 text-red-400" /> },
                ].map((m) => (
                  <div key={m.label} className="p-3 rounded-xl bg-secondary/30 border border-border/40 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">{m.icon}<span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{m.label}</span></div>
                    <span className="font-bold text-foreground text-sm">{m.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* New Client Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Novo Cliente"
        description="Cadastre um novo cliente no CRM do DOMUS BARBER."
      >
        <form onSubmit={handleAddClient} className="flex flex-col gap-4">
          <Input label="Nome Completo *" placeholder="Arthur Pendragon" value={formName} onChange={(e) => setFormName(e.target.value)} icon={<User className="w-4 h-4 text-muted-foreground/60" />} autoFocus />
          <Input label="WhatsApp *" placeholder="(11) 99999-9999" type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} icon={<Phone className="w-4 h-4 text-muted-foreground/60" />} />
          <Input label="Email" placeholder="nome@exemplo.com" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} icon={<Mail className="w-4 h-4 text-muted-foreground/60" />} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="CPF" placeholder="000.000.000-00" value={formDoc} onChange={(e) => setFormDoc(e.target.value)} icon={<FileText className="w-4 h-4 text-muted-foreground/60" />} />
            <Input label="Nascimento" type="date" value={formBirth} onChange={(e) => setFormBirth(e.target.value)} />
          </div>
          <Textarea label="Observações" placeholder="Preferências, histórico de saúde, etc." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
          <Button type="submit" isLoading={isSubmitting} className="w-full mt-2">Salvar Cliente</Button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
