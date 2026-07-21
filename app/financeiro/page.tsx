// app/financeiro/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader, MetricCard } from '../../components/ui/DashboardWidgets';
import Modal from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import Select from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import { db } from '../../services/db';
import { formatCurrency } from '../../lib/utils';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  Plus, TrendingUp, TrendingDown, DollarSign, ArrowUpCircle,
  ArrowDownCircle, Calendar, Landmark, Search, Filter,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, isWithinInterval, parseISO,
  subDays, eachDayOfInterval, isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { FinancialTransaction, TransactionType, PaymentMethod } from '../../types';

const CATEGORY_LABELS: Record<string, string> = {
  sale_product: 'Venda de Produto',
  service_appointment: 'Serviço',
  rent: 'Aluguel',
  wage: 'Salário',
  supplies: 'Insumos',
  marketing: 'Marketing',
  commission: 'Comissão',
  other: 'Outros',
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  credit_card: 'Cartão Crédito',
  debit_card: 'Cartão Débito',
  pix: 'PIX',
  bank_slip: 'Boleto',
};

const DARK_CHART_STYLE = { backgroundColor: 'transparent' };

export default function FinanceiroPage() {
  const { toast } = useToast();
  const company = db.getCurrentCompany();

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [fType, setFType] = useState<TransactionType>('income');
  const [fCategory, setFCategory] = useState('other');
  const [fAmount, setFAmount] = useState('');
  const [fDescription, setFDescription] = useState('');
  const [fDate, setFDate] = useState(new Date().toISOString().split('T')[0]);
  const [fPayment, setFPayment] = useState<PaymentMethod>('pix');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const companyId = company?.id;

  const loadData = useCallback(() => {
    if (!companyId) return;
    setTransactions(db.getFinancialTransactions(companyId));
  }, [companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const today = format(now, 'yyyy-MM-dd');

    const inMonth = (t: FinancialTransaction) =>
      isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd });

    const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const monthIncome = transactions.filter((t) => t.type === 'income' && inMonth(t)).reduce((s, t) => s + t.amount, 0);
    const monthExpense = transactions.filter((t) => t.type === 'expense' && inMonth(t)).reduce((s, t) => s + t.amount, 0);
    const todayIncome = transactions.filter((t) => t.type === 'income' && t.date === today).reduce((s, t) => s + t.amount, 0);
    const todayExpense = transactions.filter((t) => t.type === 'expense' && t.date === today).reduce((s, t) => s + t.amount, 0);

    return {
      income, expense,
      monthIncome, monthExpense,
      monthProfit: monthIncome - monthExpense,
      todayBalance: todayIncome - todayExpense,
    };
  }, [transactions]);

  // Cashflow chart data (last 30 days)
  const cashflowData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    return days.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const income = transactions.filter((t) => t.type === 'income' && t.date === dayStr).reduce((s, t) => s + t.amount, 0);
      const expense = transactions.filter((t) => t.type === 'expense' && t.date === dayStr).reduce((s, t) => s + t.amount, 0);
      return { day: format(day, 'dd/MM'), income, expense };
    });
  }, [transactions]);

  // Revenue by category
  const categoryData = useMemo(() => {
    const incomeByCategory: Record<string, number> = {};
    transactions.filter((t) => t.type === 'income').forEach((t) => {
      incomeByCategory[t.category] = (incomeByCategory[t.category] ?? 0) + t.amount;
    });
    return Object.entries(incomeByCategory).map(([cat, amount]) => ({
      cat: CATEGORY_LABELS[cat] ?? cat,
      amount,
    })).sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = transactions;
    if (typeFilter !== 'all') list = list.filter((t) => t.type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.description?.toLowerCase().includes(q) || CATEGORY_LABELS[t.category]?.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, typeFilter, search]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!fAmount || !fDescription) {
      toast('Valor e descrição são obrigatórios.', 'warning', 'Atenção');
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));

    const tx: FinancialTransaction = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: company.id,
      type: fType,
      category: fCategory as any,
      amount: Number(fAmount),
      description: fDescription,
      date: fDate,
      payment_method: fPayment,
      appointment_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.addFinancialTransaction(tx);
    db.logAudit(company.id, db.getCurrentUser()?.id ?? null, 'financial_transaction_created', { description: fDescription, amount: fAmount });
    loadData();

    setIsSubmitting(false);
    setIsModalOpen(false);
    setFType('income'); setFCategory('other'); setFAmount(''); setFDescription('');
    setFDate(new Date().toISOString().split('T')[0]); setFPayment('pix');
    toast('Transação lançada com sucesso!', 'success', 'Sucesso');
  };

  const incomeCategories = [
    { value: 'service_appointment', label: 'Serviço / Atendimento' },
    { value: 'sale_product', label: 'Venda de Produto' },
    { value: 'other', label: 'Outros' },
  ];
  const expenseCategories = [
    { value: 'rent', label: 'Aluguel' },
    { value: 'wage', label: 'Salários / Pagamentos' },
    { value: 'supplies', label: 'Insumos / Produtos' },
    { value: 'marketing', label: 'Marketing / Anúncios' },
    { value: 'commission', label: 'Comissão de Profissional' },
    { value: 'other', label: 'Outros' },
  ];

  const tooltipStyle = { backgroundColor: '#161D2E', border: '1px solid #1E293B', borderRadius: 8, color: '#f8fafc' };

  return (
    <DashboardLayout>
      <PageHeader
        title="Fluxo Financeiro"
        description="Controle de entradas, saídas, lucro e relatórios financeiros da barbearia."
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nova Transação
          </Button>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Saldo do Dia"
          value={formatCurrency(metrics.todayBalance)}
          icon={<DollarSign className="w-5 h-5 text-primary" />}
        />
        <MetricCard
          title="Entradas do Mês"
          value={formatCurrency(metrics.monthIncome)}
          icon={<TrendingUp className="w-5 h-5 text-green-400" />}
          trend={{ value: 12, type: 'up', label: 'vs. mês anterior' }}
        />
        <MetricCard
          title="Saídas do Mês"
          value={formatCurrency(metrics.monthExpense)}
          icon={<TrendingDown className="w-5 h-5 text-red-400" />}
        />
        <MetricCard
          title="Lucro Estimado"
          value={formatCurrency(metrics.monthProfit)}
          icon={<Landmark className="w-5 h-5 text-primary" />}
          trend={{ value: metrics.monthIncome > 0 ? Math.round((metrics.monthProfit / metrics.monthIncome) * 100) : 0, type: metrics.monthProfit >= 0 ? 'up' : 'down', label: 'margem líquida' }}
        />
      </div>

      <Tabs defaultValue="transacoes">
        <TabsList className="mb-6">
          <TabsTrigger value="transacoes">Transações</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transacoes">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar transação..."
                className="w-full pl-9 pr-4 py-2.5 bg-secondary/30 border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-all"
              />
            </div>
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'Todas' },
                { value: 'income', label: 'Entradas' },
                { value: 'expense', label: 'Saídas' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTypeFilter(opt.value as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    typeFilter === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary/30 border-border/60 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction List */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <DollarSign className="w-10 h-10 text-muted-foreground/20 mb-4" />
              <h3 className="font-bold text-foreground mb-1">Nenhuma transação</h3>
              <p className="text-sm text-muted-foreground">Lance sua primeira receita ou despesa.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/40 hover:border-border/70 transition-all"
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${tx.type === 'income' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    {tx.type === 'income'
                      ? <ArrowUpCircle className="w-5 h-5 text-green-400" />
                      : <ArrowDownCircle className="w-5 h-5 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{tx.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        {CATEGORY_LABELS[tx.category] ?? tx.category}
                      </span>
                      {tx.payment_method && (
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                          {PAYMENT_LABELS[tx.payment_method] ?? tx.payment_method}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`font-extrabold text-sm ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(parseISO(tx.date + 'T00:00:00'), 'dd/MM/yyyy')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="relatorios">
          <div className="space-y-6">
            {/* Cashflow Area Chart */}
            <Card className="border border-border/40">
              <CardHeader className="border-b border-border/20 pb-3 mb-4">
                <CardTitle className="text-sm">Fluxo de Caixa — Últimos 30 dias</CardTitle>
                <CardDescription className="text-xs">Entradas e saídas diárias</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="99%" height={220} minWidth={0}>
                  <AreaChart data={cashflowData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} tickFormatter={(v) => `R$${v}`} width={60} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [formatCurrency(Number(v) || 0), '']} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                    <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#incomeGrad)" strokeWidth={2} name="Entradas" />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} name="Saídas" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by Category */}
            {categoryData.length > 0 && (
              <Card className="border border-border/40">
                <CardHeader className="border-b border-border/20 pb-3 mb-4">
                  <CardTitle className="text-sm">Entradas por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="99%" height={200} minWidth={0}>
                    <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                      <YAxis type="category" dataKey="cat" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} width={110} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [formatCurrency(Number(v) || 0), 'Receita']} />
                      <Bar dataKey="amount" fill="#F59E0B" radius={[0, 4, 4, 0]} name="Receita" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Transação"
        description="Lance uma entrada ou saída no fluxo de caixa."
      >
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          {/* Type Toggle */}
          <div className="flex gap-2 bg-secondary/40 rounded-xl p-1">
            <button
              type="button"
              onClick={() => { setFType('income'); setFCategory('other'); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${fType === 'income' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-muted-foreground hover:text-foreground'}`}
            >
              + Entrada
            </button>
            <button
              type="button"
              onClick={() => { setFType('expense'); setFCategory('other'); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${fType === 'expense' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-muted-foreground hover:text-foreground'}`}
            >
              - Saída
            </button>
          </div>

          <Select
            label="Categoria"
            value={fCategory}
            onChange={(e) => setFCategory(e.target.value)}
            options={fType === 'income' ? incomeCategories : expenseCategories}
          />

          <Input
            type="number"
            label="Valor (R$) *"
            placeholder="0.00"
            value={fAmount}
            onChange={(e) => setFAmount(e.target.value)}
            icon={<DollarSign className="w-4 h-4 text-muted-foreground/60" />}
            min="0"
            step="0.01"
            autoFocus
          />

          <Input
            type="text"
            label="Descrição *"
            placeholder="Descreva a movimentação..."
            value={fDescription}
            onChange={(e) => setFDescription(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input type="date" label="Data" value={fDate} onChange={(e) => setFDate(e.target.value)} />
            <Select
              label="Pagamento"
              value={fPayment}
              onChange={(e) => setFPayment(e.target.value as PaymentMethod)}
              options={[
                { value: 'pix', label: 'PIX' },
                { value: 'cash', label: 'Dinheiro' },
                { value: 'credit_card', label: 'Cartão Crédito' },
                { value: 'debit_card', label: 'Cartão Débito' },
                { value: 'bank_slip', label: 'Boleto' },
              ]}
            />
          </div>

          <Button type="submit" isLoading={isSubmitting} className="w-full mt-2">
            Lançar Transação
          </Button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
