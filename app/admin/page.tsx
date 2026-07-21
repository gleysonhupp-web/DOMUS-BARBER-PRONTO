// app/admin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../services/db';
import { Company, UserProfile, CompanySubscription } from '../../types';
import { ShieldAlert, Users, Building2, Crown, ChevronLeft, Search, Edit, Trash2, CheckCircle, XCircle, AlertCircle, Save, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

const ADMIN_SESSION_KEY = 'domus_super_admin_session';

export default function SuperAdminPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'empresas' | 'usuarios' | 'assinaturas'>('empresas');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [subs, setSubs] = useState<CompanySubscription[]>([]);
  const [stats, setStats] = useState({ totalCompanies: 0, activeSubs: 0, blockedSubs: 0, mrr: 0 });

  // Modal State
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

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

    setCompanies(allComps);
    setUsers(allUsers);
    setSubs(allSubs);

    // Calculate Stats
    let active = 0;
    let blocked = 0;
    let mrr = 0;

    allSubs.forEach(s => {
      if (s.status === 'active' || s.status === 'trial') {
        active++;
        mrr += 199.97; // Current single plan price
      } else {
        blocked++;
      }
    });

    setStats({
      totalCompanies: allComps.length,
      activeSubs: active,
      blockedSubs: blocked,
      mrr
    });
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') localStorage.removeItem(ADMIN_SESSION_KEY);
    router.push('/admin/login');
  };

  // --- Handlers para Empresas ---
  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    
    const updatedCompanies = companies.map(c => c.id === editingCompany.id ? editingCompany : c);
    db.saveCompanies(updatedCompanies);
    setCompanies(updatedCompanies);
    setEditingCompany(null);
    toast('Empresa atualizada com sucesso', 'success', 'Salvo');
  };

  const handleDeleteCompany = (id: string) => {
    if (!confirm('Tem certeza que deseja DELETAR esta barbearia e todos os seus dados? Esta ação é irreversível.')) return;
    const updatedCompanies = companies.filter(c => c.id !== id);
    db.saveCompanies(updatedCompanies);
    loadData();
    toast('Barbearia deletada.', 'success', 'Excluído');
  };

  // --- Handlers para Usuários ---
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    const updatedUsers = users.map(u => u.id === editingUser.id ? editingUser : u);
    db.saveProfiles(updatedUsers);
    setUsers(updatedUsers);
    setEditingUser(null);
    toast('Usuário atualizado com sucesso', 'success', 'Salvo');
  };

  const handleDeleteUser = (id: string) => {
    if (!confirm('Deletar este usuário impedirá que ele faça login. Continuar?')) return;
    const updatedUsers = users.filter(u => u.id !== id);
    db.saveProfiles(updatedUsers);
    loadData();
    toast('Usuário deletado.', 'success', 'Excluído');
  };

  // --- Handlers para Assinaturas ---
  const handleToggleSubStatus = (subId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' || currentStatus === 'trial' ? 'past_due' : 'active';
    const msg = newStatus === 'past_due' ? 'bloquear' : 'desbloquear';
    
    if (!confirm(`Deseja realmente ${msg} esta assinatura?`)) return;

    const updatedSubs = subs.map(s => {
      if (s.id === subId) {
        return { ...s, status: newStatus as any };
      }
      return s;
    });
    db.saveSubscriptions(updatedSubs);
    loadData();
    toast(`Assinatura alterada para ${newStatus}`, 'success', 'Atualizado');
  };

  const filteredCompanies = companies.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredUsers = users.filter(u => u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header Admin */}
      <header className="bg-card border-b border-border py-4 px-6 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4 max-w-7xl mx-auto w-full">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <h1 className="font-bold text-foreground">DOMUS Admin Console</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Voltar ao App
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-8">
        
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total SaaS</p>
            </div>
            <h3 className="text-3xl font-black text-foreground">{stats.totalCompanies}</h3>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-lg relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ativos / Trial</p>
            </div>
            <h3 className="text-3xl font-black text-foreground">{stats.activeSubs}</h3>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-lg relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bloqueados</p>
            </div>
            <h3 className="text-3xl font-black text-foreground">{stats.blockedSubs}</h3>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-lg relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">MRR Previsto</p>
            </div>
            <h3 className="text-3xl font-black text-foreground">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.mrr)}
            </h3>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-card border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden">
          
          {/* Tabs Navigation */}
          <div className="flex border-b border-border bg-secondary/20">
            <button 
              onClick={() => setActiveTab('empresas')}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'empresas' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:bg-secondary/50'}`}
            >
              <Building2 className="w-4 h-4" /> Barbearias
            </button>
            <button 
              onClick={() => setActiveTab('usuarios')}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'usuarios' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:bg-secondary/50'}`}
            >
              <Users className="w-4 h-4" /> Usuários
            </button>
            <button 
              onClick={() => setActiveTab('assinaturas')}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'assinaturas' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-muted-foreground hover:bg-secondary/50'}`}
            >
              <Crown className="w-4 h-4" /> Assinaturas & Financeiro
            </button>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Buscar no painel..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:border-primary outline-none"
                />
              </div>
            </div>

            {/* TAB EMPRESAS */}
            {activeTab === 'empresas' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Empresa</th>
                      <th className="px-4 py-3">Slug / Link</th>
                      <th className="px-4 py-3">Data de Criação</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map(c => (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-4 font-bold text-foreground">{c.name}</td>
                        <td className="px-4 py-4 text-muted-foreground">domusbarber.com.br/{c.slug}</td>
                        <td className="px-4 py-4 text-muted-foreground">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-4 flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingCompany(c)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteCompany(c.id)} className="border-red-500/30 text-red-500 hover:bg-red-500/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredCompanies.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma barbearia encontrada.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB USUÁRIOS */}
            {activeTab === 'usuarios' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">E-mail</th>
                      <th className="px-4 py-3">Telefone</th>
                      <th className="px-4 py-3">Membro Desde</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-4 font-bold text-foreground flex items-center gap-3">
                          <img src={u.avatar_url || ''} alt="avatar" className="w-8 h-8 rounded-full bg-secondary" />
                          {u.full_name}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-4 text-muted-foreground">{u.phone || '-'}</td>
                        <td className="px-4 py-4 text-muted-foreground">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-4 flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingUser(u)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteUser(u.id)} className="border-red-500/30 text-red-500 hover:bg-red-500/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB ASSINATURAS */}
            {activeTab === 'assinaturas' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Empresa</th>
                      <th className="px-4 py-3">Plano</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Vencimento (Fim Trial/Ciclo)</th>
                      <th className="px-4 py-3 text-right">Controle de Acesso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subs.map(s => {
                      const comp = companies.find(c => c.id === s.company_id);
                      if (!comp) return null;
                      if (searchTerm && !comp.name.toLowerCase().includes(searchTerm.toLowerCase())) return null;

                      let statusBadge = <span className="px-2 py-1 bg-green-500/10 text-green-500 border border-green-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider">Ativo</span>;
                      if (s.status === 'trial') statusBadge = <span className="px-2 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider">Trial 3 Dias</span>;
                      if (s.status === 'past_due' || s.status === 'canceled') statusBadge = <span className="px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider">Bloqueado</span>;

                      return (
                        <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-4 font-bold text-foreground">{comp.name}</td>
                          <td className="px-4 py-4 text-muted-foreground">R$ 199,97/mês</td>
                          <td className="px-4 py-4">{statusBadge}</td>
                          <td className="px-4 py-4 text-muted-foreground">{new Date(s.current_period_end).toLocaleDateString('pt-BR')}</td>
                          <td className="px-4 py-4 flex justify-end">
                            {s.status === 'past_due' || s.status === 'canceled' ? (
                              <Button variant="primary" size="sm" onClick={() => handleToggleSubStatus(s.id, s.status)}>
                                <CheckCircle className="w-4 h-4 mr-2" /> Liberar Acesso
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => handleToggleSubStatus(s.id, s.status)} className="border-red-500/30 text-red-500 hover:bg-red-500/10">
                                <AlertCircle className="w-4 h-4 mr-2" /> Suspender
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* --- MODAIS --- */}
      
      {/* Modal Edit Company */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h2 className="font-bold text-foreground flex items-center gap-2"><Building2 className="w-5 h-5" /> Editar Barbearia</h2>
              <button onClick={() => setEditingCompany(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveCompany} className="p-4 space-y-4">
              <Input 
                label="Nome da Empresa" 
                value={editingCompany.name}
                onChange={e => setEditingCompany({...editingCompany, name: e.target.value})}
              />
              <Input 
                label="Slug (Link do Agendamento)" 
                value={editingCompany.slug}
                onChange={e => setEditingCompany({...editingCompany, slug: e.target.value})}
              />
              <div className="pt-4 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setEditingCompany(null)}>Cancelar</Button>
                <Button variant="primary" type="submit"><Save className="w-4 h-4 mr-2"/> Salvar Alterações</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit User */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h2 className="font-bold text-foreground flex items-center gap-2"><Users className="w-5 h-5" /> Editar Usuário</h2>
              <button onClick={() => setEditingUser(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-4 space-y-4">
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
                <Button variant="primary" type="submit"><Save className="w-4 h-4 mr-2"/> Salvar Usuário</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
