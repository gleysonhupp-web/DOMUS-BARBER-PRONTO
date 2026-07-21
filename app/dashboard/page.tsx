"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { MetricCard, ActionCard, PageHeader, SectionHeader } from '../../components/ui/DashboardWidgets';
import { db } from '../../services/db';
import { cn, formatCurrency } from '../../lib/utils';
import { 
  DollarSign, Calendar, UserCheck, TrendingUp, Sparkles, 
  Plus, Users, Package, Brain, MessageSquare, ArrowRight, User, AlertTriangle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { format, parseISO, isSameDay, subDays, startOfWeek, startOfMonth } from 'date-fns';

// Charts
import { RevenueChart, CashflowChart, AppointmentsChart, TopServicesChart } from '../../components/dashboard/Charts';

export default function DashboardPage() {
  const router = useRouter();
  const company = db.getCurrentCompany();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  const companyId = company?.id;

  useEffect(() => {
    if (companyId) {
      setAppointments(db.getAppointments(companyId));
      setFinancials(db.getFinancialTransactions(companyId));
      setClients(db.getClients(companyId));
      setProducts(db.getProducts(companyId));
      setServices(db.getServices(companyId));
    }
  }, [companyId]);

  // Compute Metrics
  const today = new Date();
  
  // Financial Metrics
  const incomeTxs = React.useMemo(() => financials.filter(f => f.type === 'income'), [financials]);
  const revenueToday = incomeTxs.filter(f => isSameDay(parseISO(f.date), today)).reduce((sum, curr) => sum + curr.amount, 0);
  const revenueWeek = incomeTxs.filter(f => parseISO(f.date) >= startOfWeek(today)).reduce((sum, curr) => sum + curr.amount, 0);
  const revenueMonth = incomeTxs.filter(f => parseISO(f.date) >= startOfMonth(today)).reduce((sum, curr) => sum + curr.amount, 0);

  // Appointment Metrics
  const aptsToday = React.useMemo(() => appointments.filter(a => isSameDay(parseISO(a.start_time), today)), [appointments]);
  const aptsWeek = React.useMemo(() => appointments.filter(a => parseISO(a.start_time) >= startOfWeek(today)), [appointments]);
  
  const activeAptsToday = React.useMemo(() => aptsToday.filter(a => a.status === 'scheduled' || a.status === 'confirmed'), [aptsToday]);
  const completedAptsMonth = React.useMemo(() => appointments.filter(a => a.status === 'completed' && parseISO(a.start_time) >= startOfMonth(today)), [appointments]);
  const cancelledAptsMonth = React.useMemo(() => appointments.filter(a => a.status === 'cancelled' && parseISO(a.start_time) >= startOfMonth(today)), [appointments]);
  
  const avgTicket = completedAptsMonth.length > 0 
    ? completedAptsMonth.reduce((sum, curr) => sum + curr.total_price, 0) / completedAptsMonth.length 
    : 0;

  // Stock
  const lowStockCount = products.filter(p => p.stock_qty <= p.min_stock_qty).length;

  // Chart Data Generators (Memoized to prevent Recharts infinite re-renders)
  const revenueData = React.useMemo(() => {
    const data = [];
    for(let i=6; i>=0; i--) {
      const d = subDays(today, i);
      const dStr = format(d, 'yyyy-MM-dd');
      const rev = incomeTxs.filter(f => f.date.startsWith(dStr)).reduce((sum, curr) => sum + curr.amount, 0);
      data.push({ name: format(d, 'dd/MM'), revenue: rev });
    }
    return data;
  }, [incomeTxs]);

  const cashflowData = React.useMemo(() => {
    const data = [];
    for(let i=6; i>=0; i--) {
      const d = subDays(today, i);
      const dStr = format(d, 'yyyy-MM-dd');
      const inc = incomeTxs.filter(f => f.date.startsWith(dStr)).reduce((sum, curr) => sum + curr.amount, 0);
      const exp = financials.filter(f => f.type === 'expense' && f.date.startsWith(dStr)).reduce((sum, curr) => sum + curr.amount, 0);
      data.push({ name: format(d, 'dd/MM'), income: inc, expense: exp });
    }
    return data;
  }, [incomeTxs, financials]);

  const appointmentsChartData = React.useMemo(() => {
    const data = [];
    for(let i=6; i>=0; i--) {
      const d = subDays(today, i);
      const count = appointments.filter(a => isSameDay(parseISO(a.start_time), d) && a.status !== 'cancelled').length;
      data.push({ name: format(d, 'dd/MM'), appointments: count });
    }
    return data;
  }, [appointments]);

  const topServicesData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    completedAptsMonth.forEach(a => {
      const sName = a.service?.name || 'Outro';
      counts[sName] = (counts[sName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [completedAptsMonth]);

  return (
    <DashboardLayout>
      <PageHeader
        title={`Dashboard Executivo`}
        description="Acompanhe todas as métricas financeiras e operacionais da sua barbearia em tempo real."
        actions={
          <div className="flex gap-2">
            <button 
              onClick={() => router.push('/financeiro')}
              className="px-4 py-2 bg-secondary/80 text-secondary-foreground hover:bg-secondary rounded-lg text-sm font-bold border border-border/40 transition-all cursor-pointer"
            >
              Novo Lançamento
            </button>
            <button 
              onClick={() => router.push('/agenda')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-bronze-500 rounded-lg text-sm font-bold shadow-md shadow-primary/10 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Novo Agendamento
            </button>
          </div>
        }
      />

      {/* Main Metrics (Top Row) */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
        <MetricCard title="Faturamento Hoje" value={formatCurrency(revenueToday)} icon={<DollarSign className="w-5 h-5 text-green-400" />} />
        <MetricCard title="Faturamento Mês" value={formatCurrency(revenueMonth)} icon={<TrendingUp className="w-5 h-5 text-primary" />} />
        <MetricCard title="Agendamentos Hoje" value={activeAptsToday.length} icon={<Calendar className="w-5 h-5 text-blue-400" />} />
        <MetricCard title="Ticket Médio" value={formatCurrency(avgTicket)} icon={<Sparkles className="w-5 h-5 text-amber-400" />} />
        <MetricCard 
          title="Estoque Baixo" 
          value={lowStockCount} 
          icon={<AlertTriangle className={cn("w-5 h-5", lowStockCount > 0 ? "text-red-400" : "text-muted-foreground")} />} 
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <CashflowChart 
          title="Fluxo de Caixa" 
          description="Relação entre Entradas e Saídas nos últimos 7 dias."
          data={cashflowData} 
        />
        <AppointmentsChart 
          title="Volume de Agendamentos" 
          description="Total de atendimentos diários na última semana."
          data={appointmentsChartData} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Top Services */}
        <div className="lg:col-span-1">
          <TopServicesChart 
            title="Serviços Mais Realizados" 
            description="Baseado nos agendamentos finalizados do mês."
            data={topServicesData} 
          />
        </div>

        {/* Agenda Hoje Summary */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <SectionHeader
            title="Agenda de Hoje"
            description="Próximos clientes que estão aguardando atendimento."
          />
          <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto no-scrollbar">
            {activeAptsToday.length === 0 ? (
              <Card className="flex items-center justify-center p-8 text-center text-muted-foreground text-sm border-dashed">
                Nenhum agendamento pendente para hoje.
              </Card>
            ) : (
              activeAptsToday.map((apt) => {
                const startTime = new Date(apt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <Card key={apt.id} className="p-4 border border-border/40 hover:border-primary/20 flex items-center justify-between gap-4 cursor-pointer" onClick={() => router.push('/agenda')}>
                    <div className="flex items-center gap-4">
                      <div className="text-left font-extrabold text-lg text-primary shrink-0 w-14">
                        {startTime}
                      </div>
                      <div className="w-px h-8 bg-border/40 hidden sm:block" />
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-bold text-foreground leading-tight">{apt.client?.name}</span>
                        <span className="text-xs text-muted-foreground leading-none mt-1">
                          {apt.service?.name} — {apt.professional?.name}
                        </span>
                      </div>
                    </div>
                    <Badge variant={apt.status === 'confirmed' ? 'primary' : 'warning'}>
                      {apt.status === 'confirmed' ? 'Confirmado' : 'Agendado'}
                    </Badge>
                  </Card>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Action Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ActionCard
          title="Gestão de Clientes"
          description="Acesse o CRM de clientes para ver históricos."
          icon={<Users className="w-5 h-5" />}
          actionText="Ver Clientes"
          onClick={() => router.push('/clientes')}
        />
        <ActionCard
          title="Controle de Estoque"
          description="Monitore a saída de produtos."
          icon={<Package className="w-5 h-5" />}
          actionText="Ver Estoque"
          onClick={() => router.push('/estoque')}
        />
        <ActionCard
          title="Atendimento Automático"
          description="Configure as respostas automáticas para seus clientes no WhatsApp."
          icon={<Brain className="w-5 h-5" />}
          actionText="Configurar Atendimento"
          onClick={() => router.push('/ia')}
        />
        <ActionCard
          title="Link de Agendamento"
          description="Copie ou baixe o QR Code para clientes agendarem."
          icon={<ArrowRight className="w-5 h-5" />}
          actionText="Painel do Link"
          onClick={() => router.push('/link')}
        />
      </div>

    </DashboardLayout>
  );
}
