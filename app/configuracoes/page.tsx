// app/configuracoes/page.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader, SectionHeader } from '../../components/ui/DashboardWidgets';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { db } from '../../services/db';
import { useToast } from '../../components/ui/Toast';
import { Input } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Building, Shield, CreditCard, Users, History, FileLock, UserCheck, Camera, Upload } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const company = db.getCurrentCompany();

  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoUrl(event.target.result as string);
          toast('Logotipo carregado com sucesso!', 'success', 'Logotipo');
        }
      };
      reader.readAsDataURL(file);
    }
  };
  const user = db.getCurrentUser();

  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const [subscription, setSubscription] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const companyId = company?.id;

  useEffect(() => {
    if (companyId) {
      const currentCompany = db.getCurrentCompany(); // get latest safely without triggering loop
      if (currentCompany) {
        setCompanyName(currentCompany.name || '');
        setSlug(currentCompany.slug || '');
        setAddress(currentCompany.address || '');
        setNumber(currentCompany.number || '');
        setComplement(currentCompany.complement || '');
        setNeighborhood(currentCompany.neighborhood || '');
        setCity(currentCompany.city || '');
        setState(currentCompany.state || '');
        setPhone(currentCompany.phone || '27 99906-6327');
        setLogoUrl(currentCompany.logo_url || '');
      }
      
      // Load sub
      setSubscription(db.getCompanySubscription(companyId));
      
      // Load members
      const allMembers = db.getMembers().filter(m => m.company_id === companyId);
      const profiles = db.getProfiles();
      const mappedMembers = allMembers.map(m => ({
        ...m,
        user: profiles.find(p => p.id === m.user_id)
      }));
      setMembers(mappedMembers);

      // Load audit logs
      setAuditLogs(db.getAuditLogs(companyId));
    }
  }, [companyId]);

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    setIsSaving(true);

    const updated = {
      ...company,
      name: companyName,
      slug: slug ? slug.toLowerCase().replace(/[^a-z0-9-_]/g, '') : company.slug,
      address,
      number,
      complement,
      neighborhood,
      city,
      state,
      phone,
      logo_url: logoUrl || company.logo_url
    };

    // Update in list
    const list = db.getCompanies();
    const idx = list.findIndex(c => c.id === company.id);
    if (idx !== -1) {
      list[idx] = updated;
      db.saveCompanies(list);
      db.setCurrentCompany(updated);
    }

    db.logAudit(company.id, user?.id || null, 'company_settings_updated', { companyName, slug });
    setAuditLogs(db.getAuditLogs(company.id));

    setIsSaving(false);
    toast('Informações da barbearia salvas com sucesso!', 'success', 'Sucesso');
  };

  // Member Table Columns
  const memberColumns = [
    {
      header: 'Membro',
      accessor: (item: any) => (
        <div className="flex items-center gap-2.5">
          <Avatar src={item.user?.avatar_url} name={item.user?.full_name || 'Membro'} size="sm" />
          <div className="flex flex-col text-left">
            <span className="font-bold text-foreground leading-none mb-1">{item.user?.full_name}</span>
            <span className="text-[10px] text-muted-foreground">{item.user?.email}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Cargo / Função',
      accessor: (item: any) => {
        const labels: Record<string, string> = {
          owner: 'Proprietário',
          admin: 'Administrador',
          professional: 'Profissional / Barbeiro',
          receptionist: 'Recepcionista'
        };
        return (
          <Badge variant={item.role_id === 'owner' ? 'primary' : 'secondary'}>
            {labels[item.role_id] || item.role_id}
          </Badge>
        );
      }
    },
    {
      header: 'Status de Acesso',
      accessor: (item: any) => (
        <Badge variant={item.status === 'active' ? 'success' : 'outline'}>
          {item.status === 'active' ? 'Ativo' : 'Pendente'}
        </Badge>
      )
    },
    {
      header: 'Membro Desde',
      accessor: (item: any) => (
        <span className="text-muted-foreground text-xs">
          {new Date(item.created_at).toLocaleDateString('pt-BR')}
        </span>
      )
    }
  ];

  // Audit Logs Table Columns
  const auditColumns = [
    {
      header: 'Horário (UTC)',
      accessor: (item: any) => (
        <span className="text-muted-foreground font-mono text-[10px]">
          {new Date(item.created_at).toLocaleString('pt-BR')}
        </span>
      )
    },
    {
      header: 'Usuário',
      accessor: (item: any) => (
        <span className="font-bold text-foreground text-xs">{item.user?.full_name || 'Sistema'}</span>
      )
    },
    {
      header: 'Ação Realizada',
      accessor: (item: any) => {
        const actions: Record<string, string> = {
          company_onboarding: 'Onboarding realizado',
          user_signup: 'Cadastro de conta',
          user_signin: 'Login realizado',
          user_signout: 'Logout realizado',
          appointment_created: 'Agendamento criado',
          client_created: 'Cliente cadastrado',
          service_created: 'Serviço adicionado',
          product_created: 'Produto adicionado',
          financial_transaction_created: 'Lançamento financeiro',
          whatsapp_connected: 'WhatsApp conectado',
          whatsapp_disconnected: 'WhatsApp desconectado',
          company_settings_updated: 'Ajustes da barbearia atualizados'
        };
        return <span className="text-foreground text-xs font-semibold">{actions[item.action] || item.action}</span>;
      }
    },
    {
      header: 'IP de Acesso',
      accessor: (item: any) => (
        <span className="text-muted-foreground font-mono text-[10px]">{item.ip_address}</span>
      )
    }
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Ajustes do Workspace"
        description="Gerencie as informações do seu estabelecimento, controle membros da equipe, assinaturas e logs de segurança."
      />

      <Tabs defaultValue="estabelecimento">
        <TabsList className="mb-6 flex flex-wrap h-auto p-1.5 bg-secondary/60">
          <TabsTrigger value="estabelecimento" className="flex items-center gap-2 text-xs">
            <Building className="w-3.5 h-3.5" /> Estabelecimento
          </TabsTrigger>
          <TabsTrigger value="assinatura" className="flex items-center gap-2 text-xs">
            <CreditCard className="w-3.5 h-3.5" /> Plano & Assinatura
          </TabsTrigger>
          <TabsTrigger value="membros" className="flex items-center gap-2 text-xs">
            <Users className="w-3.5 h-3.5" /> Membros da Equipe
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="flex items-center gap-2 text-xs">
            <History className="w-3.5 h-3.5" /> Logs de Auditoria
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Company details (Matching Mockup #2) */}
        <TabsContent value="estabelecimento">
          <div className="max-w-2xl text-left mx-auto">
            <Card className="border border-border/40 p-6 md:p-8">
              <form onSubmit={handleUpdateCompany} className="flex flex-col gap-4">
                
                {/* Camera Logo Upload Header */}
                <div className="flex flex-col items-center justify-center mb-2">
                  <input
                    type="file"
                    ref={logoFileInputRef}
                    onChange={handleLogoFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <div 
                    onClick={() => logoFileInputRef.current?.click()}
                    className="w-20 h-20 rounded-full bg-[#2A2D35] flex items-center justify-center relative shadow-xl border border-amber-500/30 cursor-pointer group hover:border-amber-500 hover:scale-[1.04] transition-all overflow-hidden"
                    title="Clique para escolher a logomarca da barbearia"
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-amber-400 group-hover:scale-110 transition-transform" />
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="text-[11px] font-bold text-amber-400 hover:underline mt-2 flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>{logoUrl ? 'Alterar logomarca' : 'Escolher logomarca da barbearia'}</span>
                  </button>
                </div>

                {/* Field 1: NOME FANTASIA */}
                <div>
                  <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">
                    NOME FANTASIA
                  </label>
                  <input
                    type="text"
                    placeholder="Barbearia Mozinne"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="w-full bg-[#242730] border border-border/40 text-foreground text-sm rounded-2xl px-4 py-3.5 font-medium outline-none focus:border-amber-500/50 transition-all"
                    required
                  />
                </div>

                {/* Field 2: ENDEREÇO */}
                <div>
                  <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">
                    ENDEREÇO
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Rua Padre Manuel..."
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full bg-[#242730] border border-border/40 text-foreground text-sm rounded-2xl px-4 py-3.5 font-medium outline-none focus:border-amber-500/50 transition-all"
                  />
                </div>

                {/* Row: NÚMERO & COMPLEMENTO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">
                      NÚMERO
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      value={number}
                      onChange={e => setNumber(e.target.value)}
                      className="w-full bg-[#242730] border border-border/40 text-foreground text-sm rounded-2xl px-4 py-3.5 font-medium outline-none focus:border-amber-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">
                      COMPLEMENTO
                    </label>
                    <input
                      type="text"
                      placeholder="Sala 02"
                      value={complement}
                      onChange={e => setComplement(e.target.value)}
                      className="w-full bg-[#242730] border border-border/40 text-foreground text-sm rounded-2xl px-4 py-3.5 font-medium outline-none focus:border-amber-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Field 5: BAIRRO */}
                <div>
                  <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">
                    BAIRRO
                  </label>
                  <input
                    type="text"
                    placeholder="Centro"
                    value={neighborhood}
                    onChange={e => setNeighborhood(e.target.value)}
                    className="w-full bg-[#242730] border border-border/40 text-foreground text-sm rounded-2xl px-4 py-3.5 font-medium outline-none focus:border-amber-500/50 transition-all"
                  />
                </div>

                {/* Field 6: CIDADE */}
                <div>
                  <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">
                    CIDADE
                  </label>
                  <input
                    type="text"
                    placeholder="Vitória"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full bg-[#242730] border border-border/40 text-foreground text-sm rounded-2xl px-4 py-3.5 font-medium outline-none focus:border-amber-500/50 transition-all"
                  />
                </div>

                {/* Field 7: ESTADO */}
                <div>
                  <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">
                    ESTADO
                  </label>
                  <input
                    type="text"
                    placeholder="ES"
                    value={state}
                    onChange={e => setState(e.target.value)}
                    className="w-full bg-[#242730] border border-border/40 text-foreground text-sm rounded-2xl px-4 py-3.5 font-medium outline-none focus:border-amber-500/50 transition-all"
                  />
                </div>

                {/* Field 8: TELEFONE */}
                <div>
                  <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">
                    TELEFONE
                  </label>
                  <div className="flex items-center bg-[#242730] border border-border/40 text-foreground text-sm rounded-2xl px-4 py-3.5 outline-none font-mono focus-within:border-amber-500/50 transition-all gap-2">
                    <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground border-r border-border/40 pr-3 shrink-0 select-none">
                      🇧🇷 ▾  +55
                    </span>
                    <input
                      type="text"
                      placeholder="27 99906-6327"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-transparent border-none text-foreground text-sm font-mono outline-none"
                    />
                  </div>
                </div>

                {/* Bottom Full-Width Copper/Bronze Button: SALVAR */}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#B86D43] via-[#D28859] to-[#9E5732] hover:brightness-110 active:scale-[0.99] text-white font-black text-sm tracking-widest uppercase transition-all shadow-xl shadow-amber-950/40 cursor-pointer mt-4"
                >
                  SALVAR
                </button>
              </form>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: Subscriptions info */}
        <TabsContent value="assinatura">
          {subscription && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <Card className="md:col-span-2 border border-border/40 flex flex-col justify-between">
                <div>
                  <CardHeader className="border-b border-border/20 pb-3 mb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CreditCard className="w-5 h-5 text-primary" /> Detalhes do Plano Ativo
                    </CardTitle>
                    <CardDescription>Gerenciamento da assinatura recorrente da plataforma.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 text-sm leading-relaxed">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Plano Selecionado</span>
                        <span className="font-bold text-foreground text-base mt-1 block">{subscription.plan?.name}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Status da Assinatura</span>
                        <Badge variant={subscription.status === 'active' ? 'success' : (subscription.status === 'trial' ? 'warning' : 'error')} className="mt-1">
                          {subscription.status === 'active' ? 'Assinatura Ativa' : (subscription.status === 'trial' ? 'Período de Teste' : 'Acesso Bloqueado')}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Próxima Cobrança / Fim Teste</span>
                        <span className="font-semibold text-foreground mt-1 block">
                          {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Valor Recorrente</span>
                        <span className="font-semibold text-foreground mt-1 block">{formatCurrency(subscription.plan?.price)}/mês</span>
                      </div>
                    </div>
                  </CardContent>
                </div>
                <div className="p-6 border-t border-border/40 flex justify-end">
                  <Button variant="outline" className="text-xs">Alterar Plano de Assinatura</Button>
                </div>
              </Card>

              {/* Security info card */}
              <Card className="border border-border/40 p-5 bg-secondary/10 flex flex-col gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
                  <FileLock className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm text-foreground">Faturamento Seguro</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  As transações de assinatura são processadas de forma criptografada via Stripe ou Mercado Pago. A Domus não armazena dados de cartões de crédito em seus servidores PostgreSQL.
                </p>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: Members directory */}
        <TabsContent value="membros">
          <div className="flex flex-col gap-4 text-left">
            <SectionHeader
              title="Equipe de Acesso"
              description="Controle os e-mails que possuem credenciais para acessar o painel administrativo deste tenant."
            />
            <DataTable
              data={members}
              columns={memberColumns}
              emptyTitle="Nenhum membro cadastrado"
            />
          </div>
        </TabsContent>

        {/* TAB 4: Audit trail logs */}
        <TabsContent value="auditoria">
          <div className="flex flex-col gap-4 text-left">
            <SectionHeader
              title="Trilha de Auditoria e Segurança"
              description="Acompanhe o log de ações importantes realizadas por membros da equipe no Supabase."
            />
            <DataTable
              data={auditLogs}
              columns={auditColumns}
              emptyTitle="Nenhum log de auditoria encontrado"
            />
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
