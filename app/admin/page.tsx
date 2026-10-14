// app/admin/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../services/db';
import { Company, UserProfile, CompanySubscription, SubscriptionPlan, AuditLog } from '../../types';
import { 
  ShieldAlert, Users, Building2, Crown, ChevronLeft, Search, Edit, Trash2, 
  CheckCircle, XCircle, AlertCircle, Save, X, Plus, ExternalLink, Download,
  TrendingUp, Calendar, DollarSign, Activity, Lock, Unlock, Eye, Sparkles, Filter
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, 
  PieChart, Pie, Cell 
} from 'recharts';

const ADMIN_SESSION_KEY = 'domus_super_admin_session';

export default function SuperAdminPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'empresas' | 'usuarios' | 'assinaturas' | 'auditoria'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'blocked'>('all');
  
  // Data State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [subs, setSubs] = useState<CompanySubscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Modals
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanySlug, setNewCompanySlug] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planNewPrice, setPlanNewPrice] = useState<string>('');

  useEffect(() => {
    // Check for SUPER ADMIN session
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem(ADMIN_SESSION_KEY);
      if (!session) {
        router.push('/admin/login');
        return;
      }
    }
    loadData();
  }, [router]);

  const loadData = () => {
    const allComps = db.getCompanies();
    const allUsers = db.getProfiles();
    const allSubs = db.getAllSubscriptions();
    const allPlans = db.getSubscriptionPlans();
    const allLogs = db.getAllAuditLogs();

    setCompanies(allComps);
    setUsers(allUsers);
    setSubs(allSubs);
    setPlans(allPlans);
    setAuditLogs(allLogs);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') localStorage.removeItem(ADMIN_SESSION_KEY);
    router.push('/admin/login');
  };

  // KPIs & Calculations
  const stats = useMemo(() => {
    let active = 0;
    let trial = 0;
    let blocked = 0;
    let mrr = 0;

    const singlePlan = plans[0] || { price: 199.97 };

    companies.forEach(comp => {
      const sub = subs.find(s => s.company_id === comp.id);
      const status = sub?.status || 'active';
      if (status === 'active') {
        active++;
        mrr += singlePlan.price;
      } else if (status === 'trial') {
        trial++;
      } else {
        blocked++;
      }
    });

    const allApts = db.getAllAppointmentsRaw();
    const allClients = db.getAllClientsRaw();
    const allFinancials = db.getAllFinancialsRaw();

    const gmv = allFinancials
      .filter(f => f.type === 'income')
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    return {
      totalCompanies: companies.length,
      activeSubs: active,
      trialSubs: trial,
      blockedSubs: blocked,
      mrr,
      arr: mrr * 12,
      totalAppointments: allApts.length,
      totalClients: allClients.length,
      gmv
    };
  }, [companies, subs, plans]);

  // Chart Data (Mocking 6-month historical MRR trend)
  const chartData = useMemo(() => {
    const baseMRR = stats.mrr > 0 ? stats.mrr : 199.97;
    return [
      { mes: 'Mai', mrr: Math.max(0, Math.round(baseMRR * 0.4)), barbearias: Math.max(1, Math.round(stats.totalCompanies * 0.4)) },
      { mes: 'Jun', mrr: Math.max(0, Math.round(baseMRR * 0.55)), barbearias: Math.max(1, Math.round(stats.totalCompanies * 0.55)) },
      { mes: 'Jul', mrr: Math.max(0, Math.round(baseMRR * 0.7)), barbearias: Math.max(1, Math.round(stats.totalCompanies * 0.7)) },
      { mes: 'Ago', mrr: Math.max(0, Math.round(baseMRR * 0.85)), barbearias: Math.max(1, Math.round(stats.totalCompanies * 0.85)) },
      { mes: 'Set', mrr: Math.max(0, Math.round(baseMRR * 0.95)), barbearias: Math.max(1, Math.round(stats.totalCompanies * 0.95)) },
      { mes: 'Out (Atual)', mrr: baseMRR, barbearias: stats.totalCompanies },
    ];
  }, [stats]);

  const pieData = useMemo(() => [
    { name: 'Ativas', value: stats.activeSubs || 1, color: '#10B981' },
    { name: 'Trial (3 Dias)', value: stats.trialSubs, color: '#F59E0B' },
    { name: 'Bloqueadas', value: stats.blockedSubs, color: '#EF4444' },
  ], [stats]);

  // Impersonate / Enter Company Dashboard
  const handleAccessCompany = (company: Company) => {
    db.setCurrentCompany(company);
    toast(`Alternado para o painel de ${company.name}`, 'success', 'Modo Barbearia');
    router.push('/dashboard');
  };

  // Toggle Subscription Access (Block / Unblock)
  const handleToggleSubStatus = (companyId: string) => {
    const existing = subs.find(s => s.company_id === companyId);
    const currentStatus = existing?.status || 'active';
    const newStatus = currentStatus === 'active' || currentStatus === 'trial' ? 'past_due' : 'active';
    const actionLabel = newStatus === 'past_due' ? 'bloquear' : 'desbloquear';
    
    if (!confirm(`Deseja realmente ${actionLabel} o acesso desta barbearia?`)) return;

    let updatedSubs: CompanySubscription[];
    if (existing) {
      updatedSubs = subs.map(s => s.company_id === companyId ? { ...s, status: newStatus as any } : s);
    } else {
      updatedSubs = [
        ...subs,
        {
          id: `sub-${companyId}`,
          company_id: companyId,
          plan_id: 'plan-domus-199',
          status: newStatus as any,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }

    db.saveSubscriptions(updatedSubs);
    db.logAudit(companyId, null, `admin_${actionLabel}_empresa`, { companyId, newStatus });
    loadData();
    toast(`Status da assinatura alterado para ${newStatus === 'active' ? 'ATIVO' : 'BLOQUEADO'}`, 'success', 'Atualizado');
  };

  // Company CRUD
  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      toast('Informe o nome da barbearia', 'error', 'Campo obrigatório');
      return;
    }

    const cleanSlug = (newCompanySlug || newCompanyName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, '-');

    const newCompany: Company = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newCompanyName.trim(),
      slug: cleanSlug,
      logo_url: null,
      phone: newOwnerPhone || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newOwner: UserProfile = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      email: newOwnerEmail.trim() || `contato@${cleanSlug}.com.br`,
      full_name: newOwnerName.trim() || `Gestor ${newCompanyName}`,
      phone: newOwnerPhone || '',
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newCompanyName)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.addCompany(newCompany, newOwner);
    db.logAudit(newCompany.id, newOwner.id, 'admin_criou_empresa', { name: newCompany.name });
    
    loadData();
    setIsCreatingCompany(false);
    setNewCompanyName('');
    setNewCompanySlug('');
    setNewOwnerName('');
    setNewOwnerEmail('');
    setNewOwnerPhone('');
    toast('Nova barbearia cadastrada com sucesso!', 'success', 'Criado');
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    
    const updated = companies.map(c => c.id === editingCompany.id ? editingCompany : c);
    db.saveCompanies(updated);
    setCompanies(updated);
    setEditingCompany(null);
    toast('Dados da barbearia atualizados', 'success', 'Salvo');
  };

  const handleDeleteCompany = (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja DELETAR permanentemente a barbearia "${name}"? Esta ação removerá os registros.`)) return;
    const updated = companies.filter(c => c.id !== id);
    db.saveCompanies(updated);
    loadData();
    toast(`Barbearia "${name}" excluída.`, 'success', 'Excluído');
  };

  // User CRUD
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const updated = users.map(u => u.id === editingUser.id ? editingUser : u);
    db.saveProfiles(updated);
    setUsers(updated);
    setEditingUser(null);
    toast('Dados do usuário atualizados', 'success', 'Salvo');
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (!confirm(`Deletar o usuário "${name}"?`)) return;
    const updated = users.filter(u => u.id !== id);
    db.saveProfiles(updated);
    loadData();
    toast(`Usuário ${name} removido.`, 'success', 'Excluído');
  };

  // Plan Price Editor
  const handleSavePlanPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    const parsed = parseFloat(planNewPrice.replace(',', '.'));
    if (isNaN(parsed) || parsed < 0) {
      toast('Digite um valor numérico válido', 'error', 'Valor Inválido');
      return;
    }
    const updatedPlans = plans.map(p => p.id === editingPlan.id ? { ...p, price: parsed } : p);
    db.saveSubscriptionPlans(updatedPlans);
    setPlans(updatedPlans);
    setEditingPlan(null);
    toast('Valor do plano do SaaS atualizado com sucesso!', 'success', 'Plano Atualizado');
  };

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['ID', 'Nome da Barbearia', 'Slug', 'Status Assinatura', 'Data de Criação'],
      ...companies.map(c => {
        const sub = subs.find(s => s.company_id === c.id);
        return [c.id, c.name, c.slug, sub?.status || 'active', new Date(c.created_at).toLocaleDateString('pt-BR')];
      })
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_saas_domus_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Relatório CSV baixado com sucesso!', 'success', 'Download Concluído');
  };

  // Filtered Lists
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.slug.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      
      const sub = subs.find(s => s.company_id === c.id);
      const status = sub?.status || 'active';
      if (statusFilter === 'active') return status === 'active';
      if (statusFilter === 'trial') return status === 'trial';
      if (statusFilter === 'blocked') return status === 'past_due' || status === 'canceled';
      return true;
    });
  }, [companies, subs, searchTerm, statusFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm))
    );
  }, [users, searchTerm]);

  return (
    <div className="min-h-screen bg-[#0C0F17] text-foreground flex flex-col select-none">
      
      {/* ── TOP HEADER ADMIN ─────────────────────────────────────────── */}
      <header className="bg-[#141824]/90 backdrop-blur-md border-b border-gray-800/80 py-3.5 px-4 sm:px-8 sticky top-0 z-30 shadow-2xl">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/10">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-white text-base tracking-wider uppercase">DOMUS Admin Console</h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> SaaS Operacional
                </span>
              </div>
              <p className="text-[11px] text-gray-400">Painel Geral de Controle da Plataforma</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsCreatingCompany(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 active:scale-95 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" /> Nova Barbearia
            </button>

            <button
              onClick={handleExportCSV}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl border border-gray-700 cursor-pointer transition-colors"
              title="Baixar Relatório CSV"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>

            <div className="h-6 w-px bg-gray-800 mx-1 hidden sm:block" />

            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="text-gray-300 hover:text-white">
              <ChevronLeft className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Voltar ao</span> App
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold">
              Sair
            </Button>
          </div>

        </div>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 md:p-8 space-y-8">

        {/* ── KPI HIGHLIGHTS ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Total Barbearias */}
          <div className="bg-[#141824] border border-gray-800/80 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden group hover:border-blue-500/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Total SaaS</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white">{stats.totalCompanies}</h3>
            <span className="text-[11px] text-emerald-400 font-bold mt-1 inline-flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {stats.activeSubs} ativas
            </span>
          </div>

          {/* Card 2: MRR Mensal */}
          <div className="bg-[#141824] border border-gray-800/80 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">MRR Mensal</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Crown className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-amber-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.mrr)}
            </h3>
            <span className="text-[11px] text-gray-400 font-bold mt-1 block">
              ARR: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.arr)}
            </span>
          </div>

          {/* Card 3: Agendamentos na Plataforma */}
          <div className="bg-[#141824] border border-gray-800/80 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Agendamentos</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white">{stats.totalAppointments}</h3>
            <span className="text-[11px] text-gray-400 font-bold mt-1 block">
              {stats.totalClients} clientes atendidos
            </span>
          </div>

          {/* Card 4: Volume Transacionado (GMV) */}
          <div className="bg-[#141824] border border-gray-800/80 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden group hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">GMV Global</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-purple-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.gmv)}
            </h3>
            <span className="text-[11px] text-gray-400 font-bold mt-1 block">
              Movimentado no SaaS
            </span>
          </div>

        </div>

        {/* ── TABS NAVIGATION ────────────────────────────────────────── */}
        <div className="bg-[#141824] border border-gray-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          
          <div className="flex border-b border-gray-800/80 bg-[#0E121B] overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-6 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all border-b-2 ${
                activeTab === 'overview' 
                  ? 'text-amber-400 border-amber-500 bg-amber-500/5' 
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <Activity className="w-4 h-4" /> 1. Métricas & Gráficos
            </button>

            <button 
              onClick={() => setActiveTab('empresas')}
              className={`py-4 px-6 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all border-b-2 ${
                activeTab === 'empresas' 
                  ? 'text-amber-400 border-amber-500 bg-amber-500/5' 
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <Building2 className="w-4 h-4" /> 2. Barbearias ({companies.length})
            </button>

            <button 
              onClick={() => setActiveTab('usuarios')}
              className={`py-4 px-6 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all border-b-2 ${
                activeTab === 'usuarios' 
                  ? 'text-amber-400 border-amber-500 bg-amber-500/5' 
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" /> 3. Usuários ({users.length})
            </button>

            <button 
              onClick={() => setActiveTab('assinaturas')}
              className={`py-4 px-6 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all border-b-2 ${
                activeTab === 'assinaturas' 
                  ? 'text-amber-400 border-amber-500 bg-amber-500/5' 
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <Crown className="w-4 h-4" /> 4. Planos & Finanças
            </button>

            <button 
              onClick={() => setActiveTab('auditoria')}
              className={`py-4 px-6 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all border-b-2 ${
                activeTab === 'auditoria' 
                  ? 'text-amber-400 border-amber-500 bg-amber-500/5' 
                  : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldAlert className="w-4 h-4" /> 5. Logs & Segurança
            </button>
          </div>

          {/* TAB CONTENT BODY */}
          <div className="p-4 sm:p-6 space-y-6">

            {/* ── TAB 1: VISÃO GERAL (OVERVIEW) ────────────────────── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* MRR Growth Chart */}
                  <div className="lg:col-span-2 bg-[#0E121B] border border-gray-800/80 rounded-2xl p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-black text-sm text-white uppercase tracking-wider">Evolução do Faturamento Mensal (MRR)</h4>
                        <p className="text-xs text-gray-400">Crescimento de receita recorrente dos últimos meses</p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                        +35% este mês
                      </span>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="adminMrrGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                          <XAxis dataKey="mes" stroke="#6B7280" fontSize={11} />
                          <YAxis stroke="#6B7280" fontSize={11} tickFormatter={(val) => `R$${val}`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#141824', borderColor: '#374151', borderRadius: '12px' }}
                            formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'MRR']}
                          />
                          <Area type="monotone" dataKey="mrr" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#adminMrrGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Status Distribution Pie */}
                  <div className="bg-[#0E121B] border border-gray-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                    <div>
                      <h4 className="font-black text-sm text-white uppercase tracking-wider mb-1">Status das Barbearias</h4>
                      <p className="text-xs text-gray-400">Distribuição de contas ativas e bloqueadas</p>
                    </div>

                    <div className="h-44 w-full my-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#141824', borderColor: '#374151', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-800 text-xs">
                      <div className="flex justify-between items-center text-gray-300">
                        <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Ativas</span>
                        <span className="font-bold">{stats.activeSubs}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-300">
                        <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Em Trial (3 dias)</span>
                        <span className="font-bold">{stats.trialSubs}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-300">
                        <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Bloqueadas</span>
                        <span className="font-bold">{stats.blockedSubs}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Shortcuts & Latest Companies */}
                <div className="bg-[#0E121B] border border-gray-800/80 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-black text-sm text-white uppercase tracking-wider">Barbearias Cadastradas Recentemente</h4>
                    <button 
                      onClick={() => setActiveTab('empresas')}
                      className="text-xs font-bold text-amber-400 hover:underline cursor-pointer"
                    >
                      Ver todas ➔
                    </button>
                  </div>

                  <div className="divide-y divide-gray-800/80">
                    {companies.slice(0, 5).map(c => {
                      const sub = subs.find(s => s.company_id === c.id);
                      const isBlocked = sub?.status === 'past_due' || sub?.status === 'canceled';

                      return (
                        <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center font-black text-amber-400 text-xs shrink-0">
                              {c.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{c.name}</p>
                              <p className="text-[11px] text-gray-400 font-mono truncate">domusbarber.com.br/agendar/{c.slug}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isBlocked ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {isBlocked ? 'Bloqueada' : 'Ativa'}
                            </span>
                            <button
                              onClick={() => handleAccessCompany(c)}
                              className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Acessar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* ── TAB 2: BARBEARIAS (TENANTS) ──────────────────────── */}
            {activeTab === 'empresas' && (
              <div className="space-y-4">
                
                {/* Search & Status Filters */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar por nome ou slug..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0E121B] border border-gray-800 rounded-xl text-sm text-white focus:border-amber-500 outline-none transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                        statusFilter === 'all' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      Todas ({companies.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('active')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                        statusFilter === 'active' ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      Ativas ({stats.activeSubs})
                    </button>
                    <button
                      onClick={() => setStatusFilter('trial')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                        statusFilter === 'trial' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      Trial ({stats.trialSubs})
                    </button>
                    <button
                      onClick={() => setStatusFilter('blocked')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                        statusFilter === 'blocked' ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      Bloqueadas ({stats.blockedSubs})
                    </button>

                    <button
                      onClick={() => setIsCreatingCompany(true)}
                      className="sm:hidden px-3 py-1.5 bg-amber-500 text-black font-extrabold text-xs rounded-xl ml-auto"
                    >
                      + Nova
                    </button>
                  </div>
                </div>

                {/* Companies Table */}
                <div className="border border-gray-800 rounded-2xl overflow-hidden bg-[#0E121B]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[11px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-800 bg-[#121622]">
                        <tr>
                          <th className="px-4 py-3.5">Barbearia / Estabelecimento</th>
                          <th className="px-4 py-3.5">Link Público</th>
                          <th className="px-4 py-3.5">Status</th>
                          <th className="px-4 py-3.5">Data Cadastro</th>
                          <th className="px-4 py-3.5 text-right">Ações de Gestão</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60">
                        {filteredCompanies.map(c => {
                          const sub = subs.find(s => s.company_id === c.id);
                          const isBlocked = sub?.status === 'past_due' || sub?.status === 'canceled';
                          const isTrial = sub?.status === 'trial';

                          return (
                            <tr key={c.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-4 font-bold text-white flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center font-black text-amber-400 text-xs shrink-0">
                                  {c.logo_url ? (
                                    <img src={c.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                                  ) : (
                                    c.name.slice(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <span className="block font-black text-white">{c.name}</span>
                                  <span className="text-[11px] text-gray-400">{c.phone || 'Sem telefone'}</span>
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <a 
                                  href={`/agendar/${c.slug}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-xs text-amber-400 hover:underline font-mono inline-flex items-center gap-1"
                                >
                                  /agendar/{c.slug} <ExternalLink className="w-3 h-3" />
                                </a>
                              </td>

                              <td className="px-4 py-4">
                                {isBlocked ? (
                                  <span className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                    <XCircle className="w-3 h-3" /> Bloqueado
                                  </span>
                                ) : isTrial ? (
                                  <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> Trial 3 Dias
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Ativo
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-4 text-xs text-gray-400">
                                {new Date(c.created_at).toLocaleDateString('pt-BR')}
                              </td>

                              <td className="px-4 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Impersonate button */}
                                  <button
                                    onClick={() => handleAccessCompany(c)}
                                    title="Acessar painel desta barbearia"
                                    className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> <span className="hidden md:inline">Entrar</span>
                                  </button>

                                  {/* Suspend / Unsuspend */}
                                  <button
                                    onClick={() => handleToggleSubStatus(c.id)}
                                    title={isBlocked ? 'Desbloquear Acesso' : 'Bloquear / Suspender Barbearia'}
                                    className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                                      isBlocked 
                                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                    }`}
                                  >
                                    {isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                  </button>

                                  {/* Edit */}
                                  <button
                                    onClick={() => setEditingCompany(c)}
                                    title="Editar Dados"
                                    className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg cursor-pointer transition-colors"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>

                                  {/* Delete */}
                                  <button
                                    onClick={() => handleDeleteCompany(c.id, c.name)}
                                    title="Excluir Definitivamente"
                                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredCompanies.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-12 text-gray-500 text-xs">
                              Nenhuma barbearia encontrada com os filtros selecionados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* ── TAB 3: USUÁRIOS DO SISTEMA ───────────────────────── */}
            {activeTab === 'usuarios' && (
              <div className="space-y-4">
                
                <div className="relative max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar usuário por nome, email ou telefone..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0E121B] border border-gray-800 rounded-xl text-sm text-white focus:border-amber-500 outline-none transition-colors"
                  />
                </div>

                <div className="border border-gray-800 rounded-2xl overflow-hidden bg-[#0E121B]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[11px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-800 bg-[#121622]">
                        <tr>
                          <th className="px-4 py-3.5">Usuário</th>
                          <th className="px-4 py-3.5">E-mail</th>
                          <th className="px-4 py-3.5">Telefone</th>
                          <th className="px-4 py-3.5">Membro Desde</th>
                          <th className="px-4 py-3.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60">
                        {filteredUsers.map(u => (
                          <tr key={u.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-4 font-bold text-white flex items-center gap-3">
                              <img 
                                src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.full_name)}`} 
                                alt="" 
                                className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 object-cover" 
                              />
                              <div>
                                <span className="block font-black text-white">{u.full_name}</span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Conta Cadastrada</span>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-gray-300 font-mono text-xs">{u.email}</td>
                            <td className="px-4 py-4 text-gray-400 text-xs">{u.phone || '—'}</td>
                            <td className="px-4 py-4 text-gray-400 text-xs">
                              {new Date(u.created_at).toLocaleDateString('pt-BR')}
                            </td>

                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setEditingUser(u)}
                                  className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg cursor-pointer transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.full_name)}
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {filteredUsers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-12 text-gray-500 text-xs">
                              Nenhum usuário encontrado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* ── TAB 4: PLANOS & FINANCEIRO SAAS ──────────────────── */}
            {activeTab === 'assinaturas' && (
              <div className="space-y-6">
                
                {/* SaaS Plan Config Card */}
                <div>
                  <h4 className="font-black text-sm text-white uppercase tracking-wider mb-3">Planos Vendidos pelo SaaS</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {plans.map(p => (
                      <div key={p.id} className="bg-[#0E121B] border border-amber-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              Plano Oficial
                            </span>
                            <button
                              onClick={() => {
                                setEditingPlan(p);
                                setPlanNewPrice(p.price.toString());
                              }}
                              className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" /> Editar Valor
                            </button>
                          </div>
                          <h3 className="font-black text-lg text-white mt-1">{p.name}</h3>
                          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{p.description}</p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-800">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Preço de Assinatura</span>
                          <span className="text-2xl font-black text-amber-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}
                            <span className="text-xs text-gray-400 font-normal"> /mês</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subscriptions Overview Table */}
                <div className="border border-gray-800 rounded-2xl overflow-hidden bg-[#0E121B]">
                  <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <h4 className="font-black text-sm text-white uppercase tracking-wider">Histórico de Assinaturas das Barbearias</h4>
                    <span className="text-xs text-gray-400">{companies.length} barbearias registradas</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[11px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-800 bg-[#121622]">
                        <tr>
                          <th className="px-4 py-3.5">Barbearia</th>
                          <th className="px-4 py-3.5">Plano Contratado</th>
                          <th className="px-4 py-3.5">Status</th>
                          <th className="px-4 py-3.5">Data Renovação</th>
                          <th className="px-4 py-3.5 text-right">Ação de Acesso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60">
                        {companies.map(comp => {
                          const sub = subs.find(s => s.company_id === comp.id);
                          const isBlocked = sub?.status === 'past_due' || sub?.status === 'canceled';

                          return (
                            <tr key={comp.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-4 font-bold text-white">{comp.name}</td>
                              <td className="px-4 py-4 text-gray-300 font-mono text-xs">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plans[0]?.price || 199.97)}/mês
                              </td>
                              <td className="px-4 py-4">
                                {isBlocked ? (
                                  <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full text-[10px] font-black uppercase">
                                    Bloqueado
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase">
                                    Ativo
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-xs text-gray-400">
                                {sub ? new Date(sub.current_period_end).toLocaleDateString('pt-BR') : 'Sem assinatura'}
                              </td>
                              <td className="px-4 py-4 text-right">
                                <button
                                  onClick={() => handleToggleSubStatus(comp.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                                    isBlocked 
                                      ? 'bg-emerald-500 text-black hover:brightness-110' 
                                      : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                                  }`}
                                >
                                  {isBlocked ? '🔓 Liberar Acesso' : '🔒 Suspender'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* ── TAB 5: AUDITORIA & SEGURANÇA ─────────────────────── */}
            {activeTab === 'auditoria' && (
              <div className="space-y-4">
                <div className="border border-gray-800 rounded-2xl overflow-hidden bg-[#0E121B]">
                  <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-sm text-white uppercase tracking-wider">Histórico de Eventos & Logs de Segurança</h4>
                      <p className="text-xs text-gray-400">Ações registradas pelo sistema e administradores</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[11px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-800 bg-[#121622]">
                        <tr>
                          <th className="px-4 py-3.5">Ação Realizada</th>
                          <th className="px-4 py-3.5">Barbearia / Contexto</th>
                          <th className="px-4 py-3.5">IP Origem</th>
                          <th className="px-4 py-3.5 text-right">Data e Hora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60 font-mono text-xs">
                        {auditLogs.map(log => (
                          <tr key={log.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3.5 font-bold text-amber-400">
                              {log.action}
                            </td>
                            <td className="px-4 py-3.5 text-gray-300">
                              {log.company_id || 'Sistema Geral'}
                            </td>
                            <td className="px-4 py-3.5 text-gray-400">{log.ip_address || '127.0.0.1'}</td>
                            <td className="px-4 py-3.5 text-right text-gray-400">
                              {new Date(log.created_at).toLocaleString('pt-BR')}
                            </td>
                          </tr>
                        ))}

                        {auditLogs.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center py-10 text-gray-500 font-sans text-xs">
                              Nenhum log registrado até o momento.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </main>

      {/* ── MODAIS ─────────────────────────────────────────────────── */}

      {/* Modal 1: Criar Nova Barbearia */}
      {isCreatingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#141824] border border-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#0E121B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="font-black text-white text-base">Cadastrar Nova Barbearia</h3>
              </div>
              <button onClick={() => setIsCreatingCompany(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="p-6 space-y-4">
              <Input 
                label="Nome da Barbearia *" 
                placeholder="Ex: Domus Barber Club"
                value={newCompanyName}
                onChange={e => setNewCompanyName(e.target.value)}
                required
              />

              <Input 
                label="Slug do Agendamento (Link)" 
                placeholder="Ex: domus-barber-club"
                value={newCompanySlug}
                onChange={e => setNewCompanySlug(e.target.value)}
              />

              <div className="pt-2 border-t border-gray-800">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-3">Dados do Dono / Gestor</span>
                <div className="space-y-3">
                  <Input 
                    label="Nome do Proprietário" 
                    placeholder="Ex: Gustavo Silva"
                    value={newOwnerName}
                    onChange={e => setNewOwnerName(e.target.value)}
                  />
                  <Input 
                    label="E-mail de Acesso" 
                    placeholder="Ex: contato@barbearia.com.br"
                    value={newOwnerEmail}
                    onChange={e => setNewOwnerEmail(e.target.value)}
                  />
                  <Input 
                    label="WhatsApp do Gestor" 
                    placeholder="Ex: 27999999999"
                    value={newOwnerPhone}
                    onChange={e => setNewOwnerPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-gray-800">
                <Button variant="outline" type="button" onClick={() => setIsCreatingCompany(false)}>Cancelar</Button>
                <Button variant="primary" type="submit" className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold">
                  <Save className="w-4 h-4 mr-2" /> Salvar Barbearia
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Editar Barbearia */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#141824] border border-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#0E121B]">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" /> Editar Barbearia
              </h3>
              <button onClick={() => setEditingCompany(null)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveCompany} className="p-6 space-y-4">
              <Input 
                label="Nome da Barbearia" 
                value={editingCompany.name}
                onChange={e => setEditingCompany({...editingCompany, name: e.target.value})}
              />
              <Input 
                label="Slug (Link de Agendamento)" 
                value={editingCompany.slug}
                onChange={e => setEditingCompany({...editingCompany, slug: e.target.value})}
              />
              <Input 
                label="Telefone / WhatsApp" 
                value={editingCompany.phone || ''}
                onChange={e => setEditingCompany({...editingCompany, phone: e.target.value})}
              />
              <div className="pt-4 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setEditingCompany(null)}>Cancelar</Button>
                <Button variant="primary" type="submit" className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold">
                  <Save className="w-4 h-4 mr-2"/> Salvar Alterações
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Editar Usuário */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#141824] border border-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#0E121B]">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" /> Editar Usuário
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <Input 
                label="Nome Completo" 
                value={editingUser.full_name}
                onChange={e => setEditingUser({...editingUser, full_name: e.target.value})}
              />
              <Input 
                label="E-mail" 
                value={editingUser.email}
                onChange={e => setEditingUser({...editingUser, email: e.target.value})}
              />
              <Input 
                label="Telefone (WhatsApp)" 
                value={editingUser.phone || ''}
                onChange={e => setEditingUser({...editingUser, phone: e.target.value})}
              />
              <div className="pt-4 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setEditingUser(null)}>Cancelar</Button>
                <Button variant="primary" type="submit" className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold">
                  <Save className="w-4 h-4 mr-2"/> Salvar Usuário
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Editar Preço do Plano SaaS */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#141824] border border-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#0E121B]">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" /> Alterar Preço do Plano SaaS
              </h3>
              <button onClick={() => setEditingPlan(null)} className="text-gray-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSavePlanPrice} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Nome do Plano</label>
                <p className="text-sm font-bold text-white">{editingPlan.name}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Novo Preço Mensal (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={planNewPrice}
                    onChange={e => setPlanNewPrice(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0E121B] border border-gray-700 rounded-xl text-white font-black text-base focus:border-amber-500 outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setEditingPlan(null)}>Cancelar</Button>
                <Button variant="primary" type="submit" className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold">
                  <Save className="w-4 h-4 mr-2"/> Salvar Novo Preço
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
