"use client";

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { MetricCard, ActionCard, PageHeader, SectionHeader } from '../../components/ui/DashboardWidgets';
import { db } from '../../services/db';
import { cn, formatCurrency } from '../../lib/utils';
import { 
  DollarSign, Calendar, UserCheck, TrendingUp, Sparkles, 
  Plus, Users, Package, Brain, MessageSquare, ArrowRight, User, AlertTriangle, CreditCard, Zap, Coins, Clock
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
  const [paymentPeriod, setPaymentPeriod] = useState<'today' | 'month' | 'all'>('month');

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

  // Occupancy & Hours Distribution Metrics
  const occupancyMetrics = React.useMemo(() => {
    if (!companyId) return { workedHours: 0, idleHours: 0, closedHours: 0, totalAvailableHours: 0, occupancyRate: 0 };
    
    const operatingHours = db.getOperatingHours(companyId);
    const activePros = db.getProfessionals(companyId).length || 1;
    
    let weeklyOpenHours = 0;
    let weeklyClosedHours = 0;

    operatingHours.forEach(h => {
      if (h.active) {
        const [opH, opM] = h.openTime.split(':').map(Number);
        const [clH, clM] = h.closeTime.split(':').map(Number);
        const openDuration = (clH + clM / 60) - (opH + opM / 60);

        let lunchDuration = 0;
        if (h.lunchStart && h.lunchEnd) {
          const [lStartH, lStartM] = h.lunchStart.split(':').map(Number);
          const [lEndH, lEndM] = h.lunchEnd.split(':').map(Number);
          lunchDuration = (lEndH + lEndM / 60) - (lStartH + lStartM / 60);
        }

        const netDailyHours = Math.max(0, openDuration - lunchDuration);
        weeklyOpenHours += netDailyHours;
      } else {
        weeklyClosedHours += 8;
      }
    });

    const monthAvailableHoursPerPro = Math.round(weeklyOpenHours * 4.3);
    const monthClosedHoursPerPro = Math.round(weeklyClosedHours * 4.3);
    const totalAvailableHours = monthAvailableHoursPerPro * activePros;
    const closedHours = monthClosedHoursPerPro * activePros;

    const validMonthApts = appointments.filter(a => a.status !== 'cancelled' && parseISO(a.start_time) >= startOfMonth(today));
    const totalWorkedMinutes = validMonthApts.reduce((acc, apt) => {
      const serviceDur = apt.service?.duration_minutes || 30;
      return acc + serviceDur;
    }, 0);

    const workedHours = Math.round(totalWorkedMinutes / 60);
    const idleHours = Math.max(0, totalAvailableHours - workedHours);
    const occupancyRate = totalAvailableHours > 0 ? Math.min(100, Math.round((workedHours / totalAvailableHours) * 100)) : 0;

    return {
      workedHours,
      idleHours,
      closedHours,
      totalAvailableHours,
      occupancyRate
    };
  }, [companyId, appointments, today]);
  
  // Financial Metrics
  const incomeTxs = React.useMemo(() => financials.filter(f => f.type === 'income'), [financials]);
  const revenueToday = incomeTxs.filter(f => isSameDay(parseISO(f.date), today)).reduce((sum, curr) => sum + curr.amount, 0);
  const revenueWeek = incomeTxs.filter(f => parseISO(f.date) >= startOfWeek(today)).reduce((sum, curr) => sum + curr.amount, 0);
  const revenueMonth = incomeTxs.filter(f => parseISO(f.date) >= startOfMonth(today)).reduce((sum, curr) => sum + curr.amount, 0);

  // Payment Method Breakdown Metrics
  const incomeTxsPeriod = React.useMemo(() => {
    if (paymentPeriod === 'today') {
      return incomeTxs.filter(f => isSameDay(parseISO(f.date), today));
    } else if (paymentPeriod === 'month') {
      return incomeTxs.filter(f => parseISO(f.date) >= startOfMonth(today));
    }
    return incomeTxs;
  }, [incomeTxs, paymentPeriod, today]);

  const pixTxs = React.useMemo(() => incomeTxsPeriod.filter(f => f.payment_method === 'pix'), [incomeTxsPeriod]);
  const cashTxs = React.useMemo(() => incomeTxsPeriod.filter(f => f.payment_method === 'cash'), [incomeTxsPeriod]);
  const creditTxs = React.useMemo(() => incomeTxsPeriod.filter(f => f.payment_method === 'credit_card'), [incomeTxsPeriod]);
  const debitTxs = React.useMemo(() => incomeTxsPeriod.filter(f => f.payment_method === 'debit_card'), [incomeTxsPeriod]);

  const pixTotal = React.useMemo(() => pixTxs.reduce((sum, f) => sum + f.amount, 0), [pixTxs]);
  const cashTotal = React.useMemo(() => cashTxs.reduce((sum, f) => sum + f.amount, 0), [cashTxs]);
  const creditTotal = React.useMemo(() => creditTxs.reduce((sum, f) => sum + f.amount, 0), [creditTxs]);
  const debitTotal = React.useMemo(() => debitTxs.reduce((sum, f) => sum + f.amount, 0), [debitTxs]);

  const periodTotal = pixTotal + cashTotal + creditTotal + debitTotal;
  const pixPercent = periodTotal > 0 ? (pixTotal / periodTotal) * 100 : 0;
  const cashPercent = periodTotal > 0 ? (cashTotal / periodTotal) * 100 : 0;
  const creditPercent = periodTotal > 0 ? (creditTotal / periodTotal) * 100 : 0;
  const debitPercent = periodTotal > 0 ? (debitTotal / periodTotal) * 100 : 0;

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
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={() => router.push('/financeiro')}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-secondary/80 text-secondary-foreground hover:bg-secondary rounded-xl text-xs sm:text-sm font-bold border border-border/40 transition-all cursor-pointer truncate"
            >
              Novo Lançamento
            </button>
            <button 
              onClick={() => router.push('/agenda')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:brightness-110 rounded-xl text-xs sm:text-sm font-extrabold shadow-md shadow-amber-500/20 transition-all cursor-pointer truncate"
            >
              <Plus className="w-4 h-4 shrink-0" /> Novo Agendamento
            </button>
          </div>
        }
      />

      {/* Main Metrics (Top Row) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
        <MetricCard title="Faturamento Hoje" value={formatCurrency(revenueToday)} icon={<DollarSign className="w-5 h-5 text-green-400" />} />
        <MetricCard title="Faturamento Mês" value={formatCurrency(revenueMonth)} icon={<TrendingUp className="w-5 h-5 text-primary" />} />
        <MetricCard title="Taxa de Ocupação" value={`${occupancyMetrics.occupancyRate}%`} icon={<Clock className="w-5 h-5 text-amber-400" />} />
        <MetricCard title="Agendamentos Hoje" value={activeAptsToday.length} icon={<Calendar className="w-5 h-5 text-blue-400" />} />
        <MetricCard title="Ticket Médio" value={formatCurrency(avgTicket)} icon={<Sparkles className="w-5 h-5 text-amber-400" />} />
        <MetricCard 
          title="Estoque Baixo" 
          value={lowStockCount} 
          icon={<AlertTriangle className={cn("w-5 h-5", lowStockCount > 0 ? "text-red-400" : "text-muted-foreground")} />} 
        />
      </div>

      {/* Hours Distribution & Occupancy Card (Matching Mobile Reference Image) */}
      <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-card border border-border/60 shadow-xl text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h3 className="text-base sm:text-lg font-black text-foreground">Distribuição de Horas & Taxa de Ocupação</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Capacidade operacional e utilização da agenda neste mês.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-xl shrink-0 self-start sm:self-auto">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Taxa de Ocupação:</span>
            <span className="text-lg font-black text-amber-400 font-mono">{occupancyMetrics.occupancyRate}%</span>
          </div>
        </div>

        {/* Capacity Subtitle */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-extrabold text-foreground font-mono">
            {occupancyMetrics.totalAvailableHours} hrs disponíveis
          </span>
        </div>

        {/* Multi-color Stacked Bar */}
        {occupancyMetrics.totalAvailableHours > 0 ? (
          <div className="h-10 w-full bg-[#1A1D24] rounded-2xl overflow-hidden flex p-1 border border-border/40 gap-1 shadow-inner">
            {/* Trabalhadas (Green) */}
            {occupancyMetrics.workedHours > 0 && (
              <div
                style={{ width: `${Math.max(10, (occupancyMetrics.workedHours / (occupancyMetrics.workedHours + occupancyMetrics.idleHours + (occupancyMetrics.closedHours || 1))) * 100)}%` }}
                className="bg-emerald-500 rounded-xl h-full flex items-center justify-center text-black font-black text-xs font-mono transition-all shadow-md shrink-0"
                title={`Trabalhadas: ${occupancyMetrics.workedHours} hrs`}
              >
                {occupancyMetrics.workedHours} hrs
              </div>
            )}
            {/* Ocioso (Bronze/Orange) */}
            {occupancyMetrics.idleHours > 0 && (
              <div
                style={{ width: `${Math.max(10, (occupancyMetrics.idleHours / (occupancyMetrics.workedHours + occupancyMetrics.idleHours + (occupancyMetrics.closedHours || 1))) * 100)}%` }}
                className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-xl h-full flex items-center justify-center text-white font-black text-xs font-mono transition-all shadow-md flex-1"
                title={`Ocioso: ${occupancyMetrics.idleHours} hrs`}
              >
                {occupancyMetrics.idleHours} hrs
              </div>
            )}
            {/* Fechada (Gray) */}
            {occupancyMetrics.closedHours > 0 && (
              <div
                style={{ width: `${Math.max(10, (occupancyMetrics.closedHours / (occupancyMetrics.workedHours + occupancyMetrics.idleHours + (occupancyMetrics.closedHours || 1))) * 100)}%` }}
                className="bg-gray-600 rounded-xl h-full flex items-center justify-center text-gray-200 font-black text-xs font-mono transition-all shadow-md shrink-0"
                title={`Fechada: ${occupancyMetrics.closedHours} hrs`}
              >
                {occupancyMetrics.closedHours} hrs
              </div>
            )}
          </div>
        ) : (
          <div className="h-10 w-full bg-secondary/40 rounded-2xl flex items-center justify-center text-xs text-muted-foreground font-bold">
            Defina os horários de atendimento na agenda para calcular a distribuição de horas.
          </div>
        )}

        {/* Legend Row */}
        <div className="flex flex-wrap items-center gap-6 mt-4 text-xs font-bold text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm" />
            <span className="text-foreground">Trabalhadas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-amber-600 shadow-sm" />
            <span className="text-foreground">Ocioso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-gray-600 shadow-sm" />
            <span className="text-foreground">Fechada</span>
          </div>
        </div>

        {/* Notice Note matching reference image */}
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-300 font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Atenção: atendimentos por assinatura possuem regras específicas de contagem de horas.</span>
        </div>
      </div>

      {/* Revenue Breakdown by Payment Method */}
      <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-card border border-border/60 shadow-xl text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-400" />
              <h3 className="text-base sm:text-lg font-black text-foreground">Receita por Forma de Pagamento</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Valores detalhados por PIX, Dinheiro, Cartão de Crédito e Cartão de Débito.
            </p>
          </div>

          {/* Period Filter Tabs */}
          <div className="flex items-center gap-1 bg-secondary/40 p-1 rounded-xl border border-border/40 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setPaymentPeriod('today')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                paymentPeriod === 'today' ? "bg-amber-500 text-black shadow font-extrabold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Hoje
            </button>
            <button
              onClick={() => setPaymentPeriod('month')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                paymentPeriod === 'month' ? "bg-amber-500 text-black shadow font-extrabold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Este Mês
            </button>
            <button
              onClick={() => setPaymentPeriod('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                paymentPeriod === 'all' ? "bg-amber-500 text-black shadow font-extrabold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Total Geral
            </button>
          </div>
        </div>

        {/* 4 Payment Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5">
          {/* PIX */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-card to-card border border-emerald-500/30 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" /> PIX
              </span>
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">{pixPercent.toFixed(0)}%</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight">{formatCurrency(pixTotal)}</span>
            <span className="text-[10px] text-muted-foreground mt-1 block">{pixTxs.length} lançamento(s)</span>
          </div>

          {/* DINHEIRO */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-green-950/30 via-card to-card border border-green-500/30 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-green-400 uppercase tracking-wider flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-green-400" /> Dinheiro
              </span>
              <span className="text-[10px] font-bold text-green-300 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">{cashPercent.toFixed(0)}%</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-green-400 font-mono tracking-tight">{formatCurrency(cashTotal)}</span>
            <span className="text-[10px] text-muted-foreground mt-1 block">{cashTxs.length} lançamento(s)</span>
          </div>

          {/* CARTÃO DE CRÉDITO */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/30 via-card to-card border border-purple-500/30 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-purple-400" /> Cartão Crédito
              </span>
              <span className="text-[10px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-full">{creditPercent.toFixed(0)}%</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-purple-400 font-mono tracking-tight">{formatCurrency(creditTotal)}</span>
            <span className="text-[10px] text-muted-foreground mt-1 block">{creditTxs.length} lançamento(s)</span>
          </div>

          {/* CARTÃO DE DÉBITO */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/30 via-card to-card border border-blue-500/30 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-blue-400" /> Cartão Débito
              </span>
              <span className="text-[10px] font-bold text-blue-300 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-full">{debitPercent.toFixed(0)}%</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-blue-400 font-mono tracking-tight">{formatCurrency(debitTotal)}</span>
            <span className="text-[10px] text-muted-foreground mt-1 block">{debitTxs.length} lançamento(s)</span>
          </div>
        </div>

        {/* Proportional Progress Bar */}
        {periodTotal > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="h-3 w-full bg-secondary/60 rounded-full overflow-hidden flex shadow-inner border border-border/40">
              {pixPercent > 0 && <div style={{ width: `${pixPercent}%` }} className="bg-emerald-500 h-full transition-all" title={`PIX: ${formatCurrency(pixTotal)} (${pixPercent.toFixed(1)}%)`} />}
              {cashPercent > 0 && <div style={{ width: `${cashPercent}%` }} className="bg-green-500 h-full transition-all" title={`Dinheiro: ${formatCurrency(cashTotal)} (${cashPercent.toFixed(1)}%)`} />}
              {creditPercent > 0 && <div style={{ width: `${creditPercent}%` }} className="bg-purple-500 h-full transition-all" title={`Cartão Crédito: ${formatCurrency(creditTotal)} (${creditPercent.toFixed(1)}%)`} />}
              {debitPercent > 0 && <div style={{ width: `${debitPercent}%` }} className="bg-blue-500 h-full transition-all" title={`Cartão Débito: ${formatCurrency(debitTotal)} (${debitPercent.toFixed(1)}%)`} />}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>Total no Período: <strong className="text-amber-400 font-extrabold">{formatCurrency(periodTotal)}</strong></span>
              <span>{incomeTxsPeriod.length} entrada(s) contabilizada(s)</span>
            </div>
          </div>
        )}
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
