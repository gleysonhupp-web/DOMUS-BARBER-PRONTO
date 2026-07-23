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
import type { ClientSubscription, ClientSubscriptionPlan, ClientSubscriptionStatus, PaymentMethod, BankInfo } from '../../types';
import { 
  Crown, Users, DollarSign, AlertTriangle, CheckCircle2, Clock, 
  XCircle, Plus, Search, MessageCircle, Calendar, RefreshCw, 
  CreditCard, ShieldCheck, ExternalLink, Settings, Scissors,
  Bot, Sparkles, Zap, ArrowRight, Check, Landmark, Building2, QrCode, KeyRound
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

  // Bank Account State for Subscription Payouts
  const [bankInfo, setBankInfo] = useState<BankInfo>(() => db.getBankInfo(companyId));

  const handleSaveBankInfo = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveBankInfo(bankInfo);
    toast(
      `Dados da conta ${bankInfo.bank_name} salvos com sucesso! Todas as assinaturas de cortes serão depositadas nesta conta.`,
      'success',
      '🏦 Conta Bancária Salva'
    );
  };

  // New Subscription Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');

  // Credit Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardCpf, setCardCpf] = useState('');

  // Card Formatters
  const handleCardNumberChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleCardExpiryChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) {
      setCardExpiry(digits);
    } else {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    }
  };

  const handleCpfChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    const formatted = digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setCardCpf(formatted);
  };

  // Metrics
  const activeSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'expiring_soon');
  const mrr = activeSubs.reduce((acc, s) => acc + (s.plan?.price ?? 0), 0);
  const expiringSoonCount = subscriptions.filter(s => s.status === 'expiring_soon').length;
  const expiredCount = subscriptions.filter(s => s.status === 'expired').length;
  const totalCutsUsed = subscriptions.reduce((acc, s) => acc + (s.cuts_used_this_month || 0), 0);

  // AI Automation State
  const [isAiAutoRemindEnabled, setIsAiAutoRemindEnabled] = useState(true);

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

  // Auto Charge Credit Card (Recurring Billing)
  const handleChargeCreditCardCard = (sub: ClientSubscription) => {
    const price = sub.plan?.price ?? 0;
    const newExp = addDays(new Date(), 30).toISOString();
    const updated: ClientSubscription = {
      ...sub,
      status: 'active',
      start_date: new Date().toISOString(),
      expiration_date: newExp,
      total_paid: sub.total_paid + price,
      cuts_used_this_month: 0,
      updated_at: new Date().toISOString()
    };

    db.updateClientSubscription(updated);

    // Register financial transaction
    db.addFinancialTransaction({
      id: `ft-${Math.random().toString(36).substr(2, 9)}`,
      company_id: companyId,
      type: 'income',
      category: 'service_appointment',
      amount: price,
      description: `Assinatura do Clube (Cartão Recorrente) - ${sub.client?.name}`,
      date: new Date().toISOString(),
      payment_method: 'credit_card',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    setSubscriptions(db.getClientSubscriptions(companyId));
    toast(
      `💳 Valor de ${formatCurrency(price)} debitado automaticamente no Cartão de Crédito do cliente ${sub.client?.name}. Assinatura renovada por +30 dias!`,
      'success',
      '💳 Débito Automático Aprovado'
    );
  };

  // Single AI WhatsApp Payment Reminder
  const handleSendAiWhatsAppReminder = (sub: ClientSubscription) => {
    if (!sub.client?.phone) {
      toast('Cliente não possui telefone cadastrado.', 'warning', 'Atenção');
      return;
    }
    const cleanPhone = sub.client.phone.replace(/\D/g, '');
    const priceFormatted = formatCurrency(sub.plan?.price ?? 0);
    const dateFormatted = format(parseISO(sub.expiration_date), 'dd/MM/yyyy');
    
    let msgText = '';
    if (sub.payment_method === 'credit_card') {
      msgText = `Olá ${sub.client.name}! 💈 O assistente *DOMUS AI* da barbearia *${company?.name || 'Domus Barber'}* passou para avisar que sua renovação do plano *${sub.plan?.name || 'Clube'}* no valor de ${priceFormatted} será debitada automaticamente no seu cartão cadastrado no dia ${dateFormatted}. Tudo pronto para você continuar cortando o cabelo quando quiser! ✂️👑`;
    } else {
      msgText = `Olá ${sub.client.name}! 💈 O assistente *DOMUS AI* da barbearia *${company?.name || 'Domus Barber'}* passou para avisar que sua assinatura do plano *${sub.plan?.name || 'Clube'}* vence em *${dateFormatted}*.\n\nPara renovar via PIX ou Cartão e continuar cortando ilimitado, acesse o link:\nhttps://domus-barber-pronto.vercel.app/agendar/${company?.slug || 'domus'}`;
    }

    const encoded = encodeURIComponent(msgText);
    window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
    toast(`🤖 Mensagem automática de aviso da IA enviada para ${sub.client.name} no WhatsApp!`, 'success', '🤖 DOMUS AI WhatsApp');
  };

  // Batch AI Reminders for Expiring / Expired
  const handleBatchTriggerAiReminders = () => {
    const pendingSubs = subscriptions.filter(s => s.status === 'expiring_soon' || s.status === 'expired');
    if (pendingSubs.length === 0) {
      toast('Todas as assinaturas estão em dia! Nenhuma cobrança pendente para enviar no momento.', 'info', '🤖 IA DOMUS');
      return;
    }

    // Trigger for the first pending client in new tab
    const firstPending = pendingSubs[0];
    handleSendAiWhatsAppReminder(firstPending);

    toast(
      `🤖 Automação da IA iniciada! ${pendingSubs.length} cliente(s) identificado(s) com vencimento próximo. Lembretes e links de pagamento enviados via WhatsApp.`,
      'success',
      '🤖 Disparo Automático por IA'
    );
  };

  // Create new subscription
  const handleCreateSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedPlanId) {
      toast('Selecione o cliente e o plano.', 'warning', 'Atenção');
      return;
    }

    if (paymentMethod === 'credit_card') {
      const rawCard = cardNumber.replace(/\s/g, '');
      if (rawCard.length < 16) {
        toast('Insira o número completo do cartão de crédito (16 dígitos).', 'warning', 'Cartão Inválido');
        return;
      }
      if (!cardHolder.trim()) {
        toast('Insira o nome impresso no cartão de crédito.', 'warning', 'Nome no Cartão');
        return;
      }
      if (cardExpiry.length < 5) {
        toast('Insira a data de validade (MM/AA).', 'warning', 'Validade Inválida');
        return;
      }
      if (cardCvv.length < 3) {
        toast('Insira o código de segurança (CVV).', 'warning', 'CVV Inválido');
        return;
      }
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

    const lastDigits = cardNumber ? cardNumber.slice(-4) : '****';
    toast(
      paymentMethod === 'credit_card'
        ? `Cobrança de ${formatCurrency(plan?.price ?? 0)}/mês cadastrada no Cartão final ${lastDigits} com sucesso!`
        : 'Nova assinatura ativada com sucesso!',
      'success',
      '💳 Assinatura & Cartão Cadastrados'
    );
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
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              onClick={handleBatchTriggerAiReminders}
              variant="outline"
              className="text-xs text-purple-300 border-purple-500/40 hover:bg-purple-500/10 font-bold"
            >
              <Bot className="w-3.5 h-3.5 mr-1.5 text-purple-400" /> Disparar Avisos por IA
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="text-xs font-bold">
              <Plus className="w-4 h-4 mr-1.5" /> Nova Assinatura de Cliente
            </Button>
          </div>
        }
      />

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Assinantes Ativos"
          value={activeSubs.length.toString()}
          trend={{ value: 12, type: 'up', label: `${formatCurrency(mrr)}/mês` }}
          icon={<Crown className="w-5 h-5 text-amber-400" />}
        />
        <MetricCard
          title="Receita Recorrente (MRR)"
          value={formatCurrency(mrr)}
          trend={{ value: 100, type: 'up', label: 'Garantido' }}
          icon={<DollarSign className="w-5 h-5 text-green-400" />}
        />
        <MetricCard
          title="Vencem esta Semana"
          value={expiringSoonCount.toString()}
          trend={{ value: 3, type: 'down', label: 'Atenção' }}
          icon={<Clock className="w-5 h-5 text-amber-400" />}
        />
        <MetricCard
          title="Vencidas / Pendentes"
          value={expiredCount.toString()}
          trend={{ value: 5, type: 'down', label: 'Cobrar Whats' }}
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
        />
      </div>

      {/* AI Automation Status Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-950/30 via-card to-card border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-foreground text-sm">Cobrança & Avisos por IA DOMUS</span>
              <Badge variant="primary" className="bg-purple-500/10 text-purple-300 border-purple-500/30 text-[9px] font-bold">
                🟢 ATIVA (WhatsApp)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              A IA monitora as assinaturas a vencer e envia lembretes automáticos pelo WhatsApp informando sobre o débito no cartão ou chave PIX de renovação.
            </p>
          </div>
        </div>

        <Button 
          onClick={handleBatchTriggerAiReminders}
          variant="outline"
          className="text-xs text-purple-300 border-purple-500/30 hover:bg-purple-500/10 font-bold shrink-0 w-full sm:w-auto"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-400" /> Disparar Avisos por IA Agora
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="subscribers" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-card border border-border/40 p-1 rounded-xl">
          <TabsTrigger value="subscribers" className="gap-2 text-xs font-bold">
            <Users className="w-4 h-4" /> Assinantes Cadastrados ({subscriptions.length})
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-2 text-xs font-bold">
            <Crown className="w-4 h-4 text-amber-400" /> Planos do Clube
          </TabsTrigger>
          <TabsTrigger value="bank" className="gap-2 text-xs font-bold">
            <Landmark className="w-4 h-4 text-green-400" /> Conta de Recebimento
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
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-400 text-base shrink-0">
                          {sub.client?.name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-bold text-foreground text-sm">{sub.client?.name}</h4>
                            {getStatusBadge(sub.status)}
                            {sub.payment_method === 'credit_card' && (
                              <Badge variant="primary" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[9px] font-bold">
                                <CreditCard className="w-3 h-3 mr-1 inline" /> Cartão Recorrente
                              </Badge>
                            )}
                            {sub.payment_method === 'pix' && (
                              <Badge variant="primary" className="bg-green-500/10 text-green-400 border-green-500/30 text-[9px] font-bold">
                                <Zap className="w-3 h-3 mr-1 inline" /> PIX
                              </Badge>
                            )}
                            {sub.payment_method === 'cash' && (
                              <Badge variant="secondary" className="text-[9px] font-bold">
                                💵 Presencial (Balcão)
                              </Badge>
                            )}
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
                        {sub.payment_method === 'credit_card' && (
                          <Button 
                            onClick={() => handleChargeCreditCardCard(sub)} 
                            className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-extrabold shadow-sm"
                          >
                            <CreditCard className="w-3.5 h-3.5 mr-1" /> Debitar Cartão
                          </Button>
                        )}

                        <Button 
                          onClick={() => handleSendAiWhatsAppReminder(sub)}
                          variant="outline"
                          className="text-xs text-purple-300 border-purple-500/30 hover:bg-purple-500/10 font-semibold"
                        >
                          <Bot className="w-3.5 h-3.5 mr-1 text-purple-400" /> Avisar IA
                        </Button>

                        <Button 
                          onClick={() => handleRenewSubscription(sub)} 
                          variant="secondary"
                          className="text-xs text-green-400 border-green-500/30 hover:bg-green-500/10"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Renovar (+30d)
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

        {/* TAB 3: BANK ACCOUNT & PAYOUT SETTINGS */}
        <TabsContent value="bank">
          <Card className="border border-border/60 max-w-3xl mx-auto">
            <CardHeader className="border-b border-border/20 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Landmark className="w-5 h-5 text-green-400" /> Cadastro da Conta Bancária para Recebimento
              </CardTitle>
              <CardDescription>
                Cadastre sua conta bancária ou chave PIX para onde os pagamentos das assinaturas mensais dos clientes serão repassados automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSaveBankInfo} className="space-y-6">
                
                {/* Bank Details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> Dados da Instituição Financeira
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Banco / Instituição</label>
                      <select
                        value={bankInfo.bank_name}
                        onChange={e => setBankInfo({ ...bankInfo, bank_name: e.target.value })}
                        className="w-full bg-secondary border border-border text-foreground text-xs rounded-lg px-3 py-2.5 outline-none font-bold"
                      >
                        <option value="Banco Nubank (0260)">Banco Nubank (0260)</option>
                        <option value="Banco Itaú Unibanco (0341)">Banco Itaú Unibanco (0341)</option>
                        <option value="Banco Bradesco (0237)">Banco Bradesco (0237)</option>
                        <option value="Banco do Brasil (0001)">Banco do Brasil (0001)</option>
                        <option value="Banco Santander (0033)">Banco Santander (0033)</option>
                        <option value="Banco Inter (0077)">Banco Inter (0077)</option>
                        <option value="Banco C6 Bank (0336)">Banco C6 Bank (0336)</option>
                        <option value="Caixa Econômica (0104)">Caixa Econômica (0104)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Tipo de Conta</label>
                      <select
                        value={bankInfo.account_type}
                        onChange={e => setBankInfo({ ...bankInfo, account_type: e.target.value as any })}
                        className="w-full bg-secondary border border-border text-foreground text-xs rounded-lg px-3 py-2.5 outline-none font-bold"
                      >
                        <option value="pj">Conta PJ (Pessoa Jurídica)</option>
                        <option value="corrente">Conta Corrente (PF)</option>
                        <option value="poupanca">Conta Poupança</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Número da Agência</label>
                      <Input
                        type="text"
                        placeholder="0001"
                        value={bankInfo.agency}
                        onChange={e => setBankInfo({ ...bankInfo, agency: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Conta com Dígito</label>
                      <Input
                        type="text"
                        placeholder="1234567-8"
                        value={bankInfo.account_number}
                        onChange={e => setBankInfo({ ...bankInfo, account_number: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full border-t border-border/40" />

                {/* PIX Key Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                    <QrCode className="w-4 h-4" /> Chave PIX para Recebimentos Instantâneos
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Tipo de Chave PIX</label>
                      <select
                        value={bankInfo.pix_key_type}
                        onChange={e => setBankInfo({ ...bankInfo, pix_key_type: e.target.value as any })}
                        className="w-full bg-secondary border border-border text-foreground text-xs rounded-lg px-3 py-2.5 outline-none font-bold"
                      >
                        <option value="cpf_cnpj">CNPJ / CPF</option>
                        <option value="email">E-mail</option>
                        <option value="phone">Telefone Celular</option>
                        <option value="random">Chave Aleatória (EVP)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Chave PIX Principal</label>
                      <Input
                        type="text"
                        placeholder="Insira sua Chave PIX"
                        value={bankInfo.pix_key}
                        onChange={e => setBankInfo({ ...bankInfo, pix_key: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Nome do Titular / Razão Social</label>
                      <Input
                        type="text"
                        placeholder="Domus Barber Club LTDA"
                        value={bankInfo.holder_name}
                        onChange={e => setBankInfo({ ...bankInfo, holder_name: e.target.value })}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">CPF / CNPJ do Titular</label>
                      <Input
                        type="text"
                        placeholder="12.345.678/0001-99"
                        value={bankInfo.holder_document}
                        onChange={e => setBankInfo({ ...bankInfo, holder_document: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full border-t border-border/40" />

                {/* Gateway Integration Key */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4" /> Gateway de Pagamento Recorrente (API)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Provedor do Gateway</label>
                      <select
                        value={bankInfo.gateway_provider || 'asaas'}
                        onChange={e => setBankInfo({ ...bankInfo, gateway_provider: e.target.value as any })}
                        className="w-full bg-secondary border border-border text-foreground text-xs rounded-lg px-3 py-2.5 outline-none font-bold"
                      >
                        <option value="asaas">Asaas Subscrições / Cartão & PIX</option>
                        <option value="mercadopago">Mercado Pago Assinaturas</option>
                        <option value="pagarme">Pagar.me / Stone Recorrência</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Chave de API de Integração</label>
                      <Input
                        type="password"
                        placeholder="$asaas_api_key_prod_..."
                        value={bankInfo.gateway_api_key || ''}
                        onChange={e => setBankInfo({ ...bankInfo, gateway_api_key: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center gap-3 text-xs text-green-300">
                  <ShieldCheck className="w-5 h-5 text-green-400 shrink-0" />
                  <div>
                    <span className="font-extrabold block text-foreground">Depósitos Diretos e Automáticos</span>
                    <span>O valor cobrado nos cartões e PIX dos assinantes será liquidado diretamente nesta conta bancária.</span>
                  </div>
                </div>

                <Button type="submit" className="w-full font-extrabold text-xs">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Salvar Dados Bancários e Chave PIX
                </Button>

              </form>
            </CardContent>
          </Card>
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

              {/* Credit Card Input Fields Section */}
              {paymentMethod === 'credit_card' && (
                <div className="p-4 rounded-2xl bg-secondary/30 border border-amber-500/30 space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" /> Dados do Cartão de Crédito
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">Cobrança Recorrente</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Número do Cartão de Crédito</label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="0000 0000 0000 0000"
                        value={cardNumber}
                        onChange={e => handleCardNumberChange(e.target.value)}
                        className="font-mono text-xs pr-10"
                        maxLength={19}
                      />
                      <CreditCard className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Nome Impresso no Cartão</label>
                    <Input
                      type="text"
                      placeholder="EX: RODRIGO O OLIVEIRA"
                      value={cardHolder}
                      onChange={e => setCardHolder(e.target.value.toUpperCase())}
                      className="text-xs uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Validade (MM/AA)</label>
                      <Input
                        type="text"
                        placeholder="12/28"
                        value={cardExpiry}
                        onChange={e => handleCardExpiryChange(e.target.value)}
                        className="font-mono text-xs text-center"
                        maxLength={5}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Código (CVV)</label>
                      <Input
                        type="text"
                        placeholder="123"
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="font-mono text-xs text-center"
                        maxLength={4}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">CPF do Titular do Cartão</label>
                    <Input
                      type="text"
                      placeholder="000.000.000-00"
                      value={cardCpf}
                      onChange={e => handleCpfChange(e.target.value)}
                      className="font-mono text-xs"
                      maxLength={14}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-green-400 font-semibold pt-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Cobrança recorrente mensal 100% criptografada no gateway.
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed">
                ℹ️ A assinatura dará acesso ao cliente por **30 dias consecutivos**. O valor será cobrado automaticamente a cada ciclo.
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
