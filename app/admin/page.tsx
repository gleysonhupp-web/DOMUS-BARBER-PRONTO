// app/admin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../services/db';
import { authService } from '../../services/auth';
import { ShieldAlert, Unlock, Lock, Search, Building2, Crown, ChevronLeft } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../lib/utils';
import { PageHeader } from '../../components/ui/DashboardWidgets';

export default function SuperAdminPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, active: 0, blocked: 0, mrr: 0 });

  useEffect(() => {
    // Basic auth check
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    loadData();
  }, [router]);

  const loadData = () => {
    const allCompanies = db.getCompanies();
    const allSubs = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('domus_subscriptions') || '[]') : [];
    const allPlans = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('domus_plans') || '[]') : [];
    
    // Default fallback if plans empty
    const domusPlan = allPlans.find((p:any) => p.id === 'plan-domus-199') || { price: 199 };

    const enriched = allCompanies.map(company => {
      const sub = allSubs.find((s:any) => s.company_id === company.id);
      return {
        ...company,
        subscription: sub,
        plan: domusPlan
      };
    });

    setCompanies(enriched);

    // Calc stats
    let active = 0;
    let blocked = 0;
    enriched.forEach(c => {
      if (c.subscription?.status === 'active' || c.subscription?.status === 'trial') active++;
      if (c.subscription?.status === 'past_due' || c.subscription?.status === 'unpaid') blocked++;
    });

    setStats({
      total: enriched.length,
      active,
      blocked,
      mrr: enriched.length * 199 // Simple mock MRR
    });
  };

  const handleUnlock = (companyId: string) => {
    if(confirm("Tem certeza que deseja LIBERAR o acesso desta barbearia?")) {
      const allSubs = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('domus_subscriptions') || '[]') : [];
      const updated = allSubs.map((s:any) => {
        if(s.company_id === companyId) {
          return { ...s, status: 'active' }; // Force unlock to active
        }
        return s;
      });
      if (typeof window !== 'undefined') localStorage.setItem('domus_subscriptions', JSON.stringify(updated));
      loadData();
      alert("Acesso liberado com sucesso!");
    }
  };

  const handleBlock = (companyId: string) => {
    if(confirm("Tem certeza que deseja BLOQUEAR o acesso desta barbearia?")) {
      const allSubs = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('domus_subscriptions') || '[]') : [];
      const updated = allSubs.map((s:any) => {
        if(s.company_id === companyId) {
          return { ...s, status: 'past_due' }; // Force block
        }
        return s;
      });
      if (typeof window !== 'undefined') localStorage.setItem('domus_subscriptions', JSON.stringify(updated));
      loadData();
      alert("Barbearia bloqueada.");
    }
  };

  const filtered = companies.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      {/* Top navbar for Super Admin */}
      <header className="h-16 border-b border-border/40 bg-card/50 backdrop-blur-md flex items-center px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4 max-w-7xl mx-auto w-full">
          <ShieldAlert className="w-6 h-6 text-primary" />
          <h1 className="font-bold text-foreground">DOMUS Admin Console</h1>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Voltar ao App
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        <PageHeader 
          title="Controle Geral do SaaS" 
          description="Gerencie todas as barbearias cadastradas, ative e desative assinaturas manualmente." 
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border border-border/40 bg-secondary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Total Clientes</p>
                <p className="text-2xl font-black">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border/40 bg-secondary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Unlock className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Ativos / Trial</p>
                <p className="text-2xl font-black">{stats.active}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border/40 bg-secondary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Bloqueados</p>
                <p className="text-2xl font-black">{stats.blocked}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border/40 bg-secondary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">MRR Previsto</p>
                <p className="text-2xl font-black text-primary">{formatCurrency(stats.mrr)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border border-border/40">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Barbearias Cadastradas</CardTitle>
                <CardDescription>Lista de todos os tenants (empresas) do sistema.</CardDescription>
              </div>
              <div className="w-64">
                <Input 
                  type="text" 
                  placeholder="Buscar barbearia..." 
                  icon={<Search className="w-4 h-4 text-muted-foreground" />}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="p-4 font-semibold">Barbearia / Empresa</th>
                    <th className="p-4 font-semibold">Slug</th>
                    <th className="p-4 font-semibold">Status Assinatura</th>
                    <th className="p-4 font-semibold text-right">Ações de Controle</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhuma barbearia encontrada.</td>
                    </tr>
                  ) : (
                    filtered.map(company => {
                      const status = company.subscription?.status;
                      const isBlocked = status === 'past_due' || status === 'unpaid' || status === 'canceled';
                      
                      return (
                        <tr key={company.id} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                          <td className="p-4 font-medium text-foreground">{company.name}</td>
                          <td className="p-4 text-muted-foreground">{company.slug}</td>
                          <td className="p-4">
                            {status === 'active' && <Badge variant="success">Ativo</Badge>}
                            {status === 'trial' && <Badge variant="warning">Período de Teste</Badge>}
                            {isBlocked && <Badge variant="error">Bloqueado</Badge>}
                            {!status && <Badge variant="outline">Sem Plano</Badge>}
                          </td>
                          <td className="p-4 text-right">
                            {isBlocked ? (
                              <Button size="sm" variant="outline" className="border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-500" onClick={() => handleUnlock(company.id)}>
                                <Unlock className="w-3.5 h-3.5 mr-2" /> Liberar Acesso
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" className="border-red-500/50 hover:bg-red-500/10 hover:text-red-500" onClick={() => handleBlock(company.id)}>
                                <Lock className="w-3.5 h-3.5 mr-2" /> Bloquear
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
