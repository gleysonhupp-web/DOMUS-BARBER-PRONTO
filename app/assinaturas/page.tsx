// app/assinaturas/page.tsx
'use client';

import React, { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader, MetricCard } from '../../components/ui/DashboardWidgets';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';
import { db } from '../../services/db';
import { formatCurrency } from '../../lib/utils';
import type { ClientSubscription, ClientSubscriptionPlan, ClientSubscriptionStatus, PaymentMethod } from '../../types';
import { 
  Crown, Users, DollarSign, AlertTriangle, CheckCircle2, Clock, 
  XCircle, Plus, Search, MessageCircle, Calendar, RefreshCw, 
  CreditCard, ShieldCheck, ExternalLink, Settings, Scissors
} from 'lucide-react';
import { format, addDays, isBefore, parseISO } from 'date-fns';

export default function AssinaturasPage() {
  const { toast } = useToast();
  const company = db.getCurrentCompany();
  const companyId = company?.id ?? 'c1111111-1111-1111-1111-111111111111';

  const [subscriptions, setSubscriptions] = useState<ClientSubscription[]>(() => db.getClientSubscriptions(companyId));
  const [plans, setPlans] = useState<ClientSubscriptionPlan[]>(() => db.getClientSubscriptionPlans(companyId));
  const clients = db.getClients(companyId);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ClientSubscriptionStatus>('all');
  const [activeTab, setActiveTab] = useState('subscribers');

  // New Subscription Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');

  // Metrics
  const activeSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'expiring_soon');
  const mrr = activeSubs.reduce((acc, s) => acc + (s.plan?.price ?? 0), 0);
  const expiringSoonCount = subscriptions.filter(s => s.status === 'expiring_soon').length;
  const expiredCount = subscriptions.filter(s => s.status === 'expired').length;
  const totalCutsUsed = subscriptions.reduce((acc, s) => acc + (s.cuts_used_this_month || 0), 0);

  // Renew Subscription action
  const handleRenewSubscription = (sub: ClientSubscription) => {
    const newExp = addDays(new Date(), 30).toISOString();
    const updated: ClientSubscription = {
      ...sub,
      status: 'active',
      start_date: new Date().toISOString(),
      expiration_date: newExp,
      total_paid: sub.total_paid + (sub.plan?.price ?? 0),
      cuts_used_this_month: 0,
      updated_at: new Date().toISOString()
    };

    db.updateClientSubscription(updated);
    setSubscriptions(db.getClientSubscriptions(companyId));
    toast(`Assinatura do cliente ${sub.client?.name} renovada por mais 30 dias!`, 'success', '✅ Assinatura Renovada');
  };

  // Cancel Subscription action
  const handleCancelSubscription = (sub: ClientSubscription) => {
    const updated: ClientSubscription = {
      ...sub,
      status: 'canceled',
      auto_renew: false,
      updated_at: new Date().toISOString()
    };

    db.updateClientSubscription(updated);
    setSubscriptions(db.getClientSubscriptions(companyId));
    toast(`Assinatura de ${sub.client?.name} foi cancelada.`, 'warning', 'Assinatura Cancelada');
  };

  // Charge via WhatsApp action
  const handleSendWhatsAppCharge = (sub: ClientSubscription) => {
    if (!sub.client?.phone) {
      toast('Cliente não possui telefone cadastrado.', 'warning', 'Atenção');
      return;
    }
    const cleanPhone = sub.client.phone.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Olá ${sub.client.name}! 💈 Seu plano de assinatura no *${company?.name || 'Domus Barber'}* está próximo do vencimento (${format(parseISO(sub.expiration_date), 'dd/MM/yyyy')}).\n\n` +
      `Para renovar e continuar cortando o cabelo ilimitado, acesse o link:\nhttps://domus-barber-pronto.vercel.app/agendar/${company?.slug || 'domus'}`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${text}`, '_blank');
  };

  // Create new subscription
  const handleCreateSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedPlanId) {
      toast('Selecione o cliente e o plano.', 'warning', 'Atenção');
      return;
    }

    const plan = plans.find(p => p.id === selectedPlanId);
    const newSub: ClientSubscription = {
      id: `cs-${Math.random().toString(36).substr(2, 9)}`,
      company_id: companyId,
      client_id: selectedClientId,
      plan_id: selectedPlanId,
      status: 'active',
      start_date: new Date().toISOString(),
      expiration_date: addDays(new Date(), 30).toISOString(),
      auto_renew: true,
      payment_method: paymentMethod,
      total_paid: plan?.price ?? 0,
      cuts_used_this_month: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.addClientSubscription(newSub);
    setSubscriptions(db.getClientSubscriptions(companyId));
    setIsModalOpen(false);
    toast('Nova assinatura ativada com sucesso!', 'success', '👑 Clube de Assinatura');
  };

  // Filter subscriptions list
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      sub.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.client?.phone?.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ClientSubscriptionStatus) => {
    switch (status) {
      case 'active':
        return <Badge variant="primary" className="bg-green-500/10 text-green-400 border-green-500/30 font-bold">🟢 Ativo (Pago)</Badge>;
      case 'expiring_soon':
        return <Badge variant="primary" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold">⚠️ Vence em Breve</Badge>;
      case 'expired':
        return <Badge variant="primary" className="bg-red-500/10 text-red-400 border-red-500/30 font-bold">🔴 Vencido</Badge>;
      case 'canceled':
        return <Badge variant="secondary" className="text-muted-foreground font-bold">⚪ Cancelado</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Gestão de Assinaturas (Clube da Barbearia)"
        description="Controle os clientes que pagam mensalidade para cortar o cabelo ilimitado. Veja vencimentos e receba em dia."
        action={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nova Assinatura de Cliente
          </Button>
        }
      />

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Assinantes Ativos"
          value={activeSubs.length.toString()}
          trend={`${formatCurrency(mrr)}/mês em MRR`}
          trendType="up"
          icon={<Crown className="w-5 h-5 text-amber-400" />}
        />
        <MetricCard
          title="Receita Recorrente (MRR)"
          value={formatCurrency(mrr)}
          trend="Faturamento mensal garantido"
          trendType="neutral"
          icon={<DollarSign className="w-5 h-5 text-green-400" />}
        />
        <MetricCard
          title="Vencem esta Semana"
          value={expiringSoonCount.toString()}
          trend="Requer atenção para renovação"
          trendType={expiringSoonCount > 0 ? "down" : "neutral"}
          icon={<Clock className="w-5 h-5 text-amber-400" />}
        />
        <MetricCard
          title="Vencidas / Pendentes"
          value={expiredCount.toString()}
          trend="Clique para cobrar via Whats"
          trendType={expiredCount > 0 ? "down" : "neutral"}
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-card border border-border/40 p-1 rounded-xl">
          <TabsTrigger value="subscribers" className="gap-2 text-xs font-bold">
            <Users className="w-4 h-4" /> Assinantes Cadastrados ({subscriptions.length})
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-2 text-xs font-bold">
            <Crown className="w-4 h-4 text-amber-400" /> Planos do Clube
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CLIENT SUBSCRIBERS LIST */}
        <TabsContent value="subscribers">
          <Card className="border border-border/60">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/20">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" /> Painel de Controle de Vencimentos
                </CardTitle>
                <CardDescription>Acompanhe quem está em dia, quem precisa renovar e cobre via WhatsApp com 1 clique.</CardDescription>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar cliente ou telefone..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="bg-secondary border border-border text-foreground text-xs rounded-lg px-3 py-2 outline-none"
                >
                  <option value="all">Todos os Status</option>
                  <option value="active">Ativos (Pagos)</option>
                  <option value="expiring_soon">Vencendo em Breve</option>
                  <option value="expired">Vencidos</option>
                  <option value="canceled">Cancelados</option>
                </select>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {filteredSubscriptions.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Nenhuma assinatura encontrada para os filtros selecionados.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSubscriptions.map((sub) => (
                    <div 
                      key={sub.id}
                      className="p-5 rounded-2xl border border-border/60 bg-card/80 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-amber-500/30 transition-all"
                    >
                      {/* Client Info */}
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-400 text-base">
                          {sub.client?.name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-foreground text-sm">{sub.client?.name}</h4>
                            {getStatusBadge(sub.status)}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span>📞 {sub.client?.phone || 'Sem telefone'}</span>
                            <span>•</span>
                            <span className="font-semibold text-amber-400">Plano: {sub.plan?.name} ({formatCurrency(sub.plan?.price ?? 0)}/mês)</span>
                          </div>
                        </div>
                      </div>

                      {/* Dates & Usage */}
                      <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Data de Vencimento</span>
                          <span className="font-bold text-foreground">
                            {format(parseISO(sub.expiration_date), 'dd/MM/yyyy')}
                          </span>
                        </div>

                        <div>
                          <span className="text-muted-foreground block text-[10px]">Cortes no Mês</span>
                          <span className="font-bold text-primary flex items-center gap-1">
                            <Scissors className="w-3.5 h-3.5" /> {sub.cuts_used_this_month} realizados
                          </span>
                        </div>

                        <div>
                          <span className="text-muted-foreground block text-[10px]">Total Pago</span>
                          <span className="font-bold text-green-400">{formatCurrency(sub.total_paid)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                        <Button 
                          onClick={() => handleRenewSubscription(sub)} 
                          variant="secondary"
                          className="text-xs text-green-400 border-green-500/30 hover:bg-green-500/10"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Renovar (+30d)
                        </Button>

                        <Button 
                          onClick={() => handleSendWhatsAppCharge(sub)}
                          variant="outline"
                          className="text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1" /> Cobrar Whats
                        </Button>

                        {sub.status !== 'canceled' && (
                          <Button 
                            onClick={() => handleCancelSubscription(sub)}
                            variant="outline"
                            className="text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: PLANS MANAGEMENT */}
        <TabsContent value="plans">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <Card key={p.id} className="border border-border/60 flex flex-col justify-between p-6 relative">
                {p.is_popular && (
                  <Badge variant="primary" className="absolute -top-3 left-6 bg-amber-500 font-bold text-[9px] shadow">
                    Mais Escolhido pelos Clientes
                  </Badge>
                )}

                <div>
                  <h3 className="text-lg font-black text-foreground mb-1">{p.name}</h3>
                  <p className="text-xs text-muted-foreground min-h-[36px] mb-4">{p.description}</p>
                  
                  <div className="flex items-baseline gap-1 my-3">
                    <span className="text-3xl font-black text-amber-400 font-mono">{formatCurrency(p.price)}</span>
                    <span className="text-xs text-muted-foreground">/mês</span>
                  </div>

                  <div className="w-full border-t border-border/40 my-4" />

                  <ul className="space-y-2 mb-6 text-xs text-muted-foreground">
                    {p.perks.map((perk, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-secondary/30 rounded-xl text-center text-xs text-muted-foreground border border-border/40 font-mono">
                  {p.cuts_included === 'unlimited' ? '✂️ Cortes Ilimitados' : `✂️ Até ${p.cuts_included} cortes/mês`}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Nova Assinatura */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="font-black text-foreground text-base flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" /> Nova Assinatura de Cliente
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubscription} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Selecione o Cliente</label>
                <select
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="w-full bg-secondary border border-border text-foreground text-xs rounded-lg px-3 py-2.5 outline-none"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone || 'Sem celular'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Selecione o Plano do Clube</label>
                <select
                  value={selectedPlanId}
                  onChange={e => setSelectedPlanId(e.target.value)}
                  className="w-full bg-secondary border border-border text-foreground text-xs rounded-lg px-3 py-2.5 outline-none font-bold text-amber-400"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}/mês</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Forma de Pagamento Inicial</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-secondary border border-border text-foreground text-xs rounded-lg px-3 py-2.5 outline-none"
                >
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="pix">PIX Instantâneo</option>
                  <option value="cash">Dinheiro no Balcão</option>
                  <option value="debit_card">Cartão de Débito</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed">
                ℹ️ A assinatura dará acesso ao cliente por **30 dias consecutivos**. Ele poderá cortar o cabelo mediante apresentação da assinatura no estabelecimento.
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  Ativar Assinatura
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
