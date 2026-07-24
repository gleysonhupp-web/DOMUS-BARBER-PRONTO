// app/profissionais/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/DashboardWidgets';
import { SearchBar } from '../../components/ui/DataTable';
import { db } from '../../services/db';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Plus, User, Percent, Pencil, Trash2, AlertTriangle, Camera, Key, Lock, Shield, Copy, MessageSquare, Check, Eye, EyeOff, Crown } from 'lucide-react';

export default function ProfissionaisPage() {
  const { toast } = useToast();
  const company = db.getCurrentCompany();
  const companyId = company?.id;

  const [professionals, setProfessionals] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProf, setEditingProf] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Credential Modal State
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [credentialProf, setCredentialProf] = useState<any | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('123456');
  const [loginRole, setLoginRole] = useState<'professional' | 'owner'>('professional');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [commission, setCommission] = useState('100');
  const [isLeader, setIsLeader] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(() => {
    if (companyId) setProfessionals(db.getProfessionals(companyId));
  }, [companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCredentialModal = (prof: any) => {
    setCredentialProf(prof);
    
    // Check if user already exists
    const profiles = db.getProfiles();
    const existingUser = profiles.find(p => p.email.toLowerCase() === (prof.email || '').toLowerCase() || p.full_name === prof.name);
    
    const formattedEmail = existingUser?.email || prof.email || `${prof.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@${company?.slug || 'domusbarber'}.com`;
    setLoginEmail(formattedEmail);
    
    // Check existing stored password or default
    if (typeof window !== 'undefined') {
      const storedPasswords = JSON.parse(localStorage.getItem('domus_passwords') || '{}');
      setLoginPassword(storedPasswords[formattedEmail.toLowerCase()] || '123456');
    } else {
      setLoginPassword('123456');
    }

    // Check existing member role
    const members = db.getMembers();
    const member = members.find(m => m.user_id === existingUser?.id && m.company_id === companyId);
    if (member?.role_id === 'owner' || member?.role_id === 'admin' || prof.is_leader) {
      setLoginRole('owner');
    } else {
      setLoginRole('professional');
    }

    setIsCredentialModalOpen(true);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !credentialProf) return;

    if (!loginEmail || !loginPassword) {
      toast('E-mail e senha são obrigatórios.', 'warning', 'Atenção');
      return;
    }

    // 1. Find or Create User Profile
    const profiles = db.getProfiles();
    let user = profiles.find(p => p.email.toLowerCase() === loginEmail.toLowerCase());
    
    if (!user) {
      user = {
        id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        email: loginEmail.toLowerCase(),
        full_name: credentialProf.name,
        phone: credentialProf.phone || '',
        avatar_url: credentialProf.avatar_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      profiles.push(user);
      db.saveProfiles(profiles);
    }

    // 2. Save Password in localStorage (domus_passwords)
    if (typeof window !== 'undefined') {
      const storedPasswords = JSON.parse(localStorage.getItem('domus_passwords') || '{}');
      storedPasswords[loginEmail.toLowerCase()] = loginPassword;
      localStorage.setItem('domus_passwords', JSON.stringify(storedPasswords));
    }

    // 3. Save / Update Company Member Membership
    const members = db.getMembers();
    const existingMemberIdx = members.findIndex(m => m.user_id === user.id && m.company_id === companyId);
    
    const memberRole = loginRole; // 'owner' or 'professional'
    
    if (existingMemberIdx !== -1) {
      members[existingMemberIdx].role_id = memberRole;
      members[existingMemberIdx].status = 'active';
    } else {
      members.push({
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        company_id: companyId,
        user_id: user.id,
        role_id: memberRole,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    db.saveMembers(members);

    // 4. Update Professional Record (is_leader & email)
    const allProfs = db.getProfessionals(companyId);
    const updatedProfs = allProfs.map(p => 
      p.id === credentialProf.id 
        ? { 
            ...p, 
            user_id: user.id,
            email: loginEmail, 
            is_leader: loginRole === 'owner', 
            updated_at: new Date().toISOString() 
          } 
        : p
    );
    db.saveProfessionals(updatedProfs);

    db.logAudit(companyId, db.getCurrentUser()?.id || null, 'barber_login_created', { 
      barber: credentialProf.name, 
      email: loginEmail, 
      role: loginRole === 'owner' ? 'Gestor' : 'Colaborador' 
    });

    toast(`Credenciais de "${credentialProf.name}" salvas com sucesso!`, 'success', 'Acesso Configurado');
    setIsCredentialModalOpen(false);
    loadData();
  };

  const handleCopyAccess = () => {
    const text = `💈 *ACESSO PAINEL DOMUS BARBER*\n\n*Profissional:* ${credentialProf?.name}\n*Link de Acesso:* https://domus-barber-pronto.vercel.app/login\n*E-mail:* ${loginEmail}\n*Senha:* ${loginPassword}\n*Permissão:* ${loginRole === 'owner' ? '👑 Gestor (Painel Completo)' : '💈 Colaborador (Agenda & Metas)'}`;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    toast('Dados de acesso copiados para a área de transferência!', 'success', 'Copiado');
    setTimeout(() => setCopiedText(false), 3000);
  };

  const handleSendWhatsAppAccess = () => {
    const rawPhone = credentialProf?.phone ? credentialProf.phone.replace(/[^0-9]/g, '') : '';
    const text = encodeURIComponent(`Olá ${credentialProf?.name}! 💈\n\nAqui estão seus dados de acesso ao painel do *DOMUS BARBER*:\n\n🔗 *Link de Login:* https://domus-barber-pronto.vercel.app/login\n📧 *E-mail:* ${loginEmail}\n🔑 *Senha:* ${loginPassword}\n🛡️ *Nível de Acesso:* ${loginRole === 'owner' ? 'Gestor (Acesso Completo)' : 'Barbeiro Colaborador (Agenda & Metas)'}\n\nAbra o link para acessar sua agenda e metas!`);
    
    if (rawPhone) {
      window.open(`https://wa.me/55${rawPhone}?text=${text}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setLoginPassword(pass);
    toast('Nova senha gerada!', 'info', 'Senha');
  };

  const openAddModal = () => {
    setEditingProf(null);
    setName('');
    setPhone('');
    setEmail('');
    setCommission('100');
    setIsLeader(true);
    setAvatarUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (prof: any) => {
    setEditingProf(prof);
    setName(prof.name || '');
    setPhone(prof.phone || '');
    setEmail(prof.email || '');
    setCommission(String(prof.commission_rate ?? 100));
    setIsLeader(prof.is_leader ?? true);
    setAvatarUrl(prof.avatar_url || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!name || !commission) {
      toast('Nome e Comissão são campos obrigatórios.', 'warning', 'Atenção');
      return;
    }

    setIsSubmitting(true);

    const allProfs = db.getProfessionals(companyId!);

    if (editingProf) {
      const updated = allProfs.map(p =>
        p.id === editingProf.id
          ? { 
              ...p, 
              name, 
              phone: phone || null, 
              email: email || null, 
              commission_rate: Number(commission), 
              is_leader: isLeader,
              avatar_url: avatarUrl || p.avatar_url,
              updated_at: new Date().toISOString() 
            }
          : p
      );
      db.saveProfessionals(updated);
      toast('Profissional atualizado com sucesso!', 'success', 'Sucesso');
      db.logAudit(company.id, db.getCurrentUser()?.id || null, 'professional_updated', { name });
    } else {
      const newProf = {
        id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        company_id: company.id,
        user_id: null,
        name,
        phone: phone || null,
        email: email || null,
        bio: null,
        avatar_url: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        commission_rate: Number(commission),
        is_leader: isLeader,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.saveProfessionals([...allProfs, newProf]);
      toast('Profissional cadastrado na equipe!', 'success', 'Sucesso');
      db.logAudit(company.id, db.getCurrentUser()?.id || null, 'professional_created', { name, commission_rate: commission });
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = () => {
    if (!deleteTarget || !companyId) return;
    const all = db.getProfessionals(companyId);
    db.saveProfessionals(all.filter(p => p.id !== deleteTarget.id));
    db.logAudit(companyId, db.getCurrentUser()?.id || null, 'professional_deleted', { name: deleteTarget.name });
    toast(`Profissional "${deleteTarget.name}" excluído.`, 'success', 'Excluído');
    setDeleteTarget(null);
    loadData();
  };

  const filteredProfs = professionals.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.bio && p.bio.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Equipe de Profissionais"
        description="Gerencie os barbeiros e cabeleireiros de sua equipe e suas respectivas comissões."
        actions={
          <Button onClick={openAddModal} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Adicionar Profissional
          </Button>
        }
      />

      <div className="mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar profissional por nome..."
          className="max-w-md w-full"
        />
      </div>

      <Card className="border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-secondary/20">
                <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider w-16">Avatar</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Bio / Especialidade</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Comissão</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredProfs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground">
                    <User className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-semibold">Nenhum profissional cadastrado</p>
                    <p className="text-xs mt-1 opacity-60">Clique em "Adicionar Profissional" para começar.</p>
                  </td>
                </tr>
              ) : (
                filteredProfs.map(prof => (
                  <tr key={prof.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-4 py-3.5 w-16">
                      <Avatar src={prof.avatar_url} name={prof.name} size="sm" />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-foreground block">{prof.name}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-muted-foreground/80 text-xs line-clamp-1 max-w-xs">{prof.bio || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-primary font-bold flex items-center gap-0.5 text-xs bg-primary/5 border border-primary/20 rounded-full px-2.5 py-0.5 w-max">
                        <Percent className="w-3 h-3 stroke-[2.5px]" />
                        {prof.commission_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={prof.is_active ? 'success' : 'outline'}>
                        {prof.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openCredentialModal(prof)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          title="Criar / Gerenciar Login de Acesso"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Criar Login</span>
                        </button>

                        <button
                          onClick={() => openEditModal(prof)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                          title="Editar profissional"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(prof)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                          title="Excluir profissional"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredProfs.length > 0 && (
          <div className="px-4 py-3 border-t border-border/30 text-xs text-muted-foreground">
            Mostrando <span className="font-bold text-primary">{filteredProfs.length}</span> {filteredProfs.length === 1 ? 'profissional' : 'profissionais'}
          </div>
        )}
      </Card>

      {/* Add / Edit Modal (Matching Mockup #1) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProf ? 'Editar Profissional' : 'Adicionar Profissional'}
        description=""
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4 text-left pt-1">
          
          {/* Avatar Upload Container */}
          <div className="flex flex-col items-center justify-center mb-2">
            <div className="w-28 h-28 rounded-[2rem] bg-[#2A2D35] flex items-center justify-center relative shadow-xl border border-white/10 cursor-pointer group hover:border-amber-500/40 transition-all overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#2A2D35]">
                  <User className="w-10 h-10 text-muted-foreground/50" />
                </div>
              )}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Field 1: NOME (APARECERÁ NA AGENDA) */}
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">
              NOME (APARECERÁ NA AGENDA)
            </label>
            <input
              type="text"
              placeholder="Mozinne o Barbeiro"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#242730] border border-border/40 text-foreground text-sm rounded-2xl px-4 py-3.5 font-medium outline-none focus:border-amber-500/50 transition-all"
              required
            />
          </div>

          {/* Field 2: TELEFONE */}
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

          {/* Field 3: E-MAIL */}
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">
              E-MAIL
            </label>
            <input
              type="email"
              placeholder="mozinne.sm@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#242730] border border-border/40 text-foreground text-sm rounded-2xl px-4 py-3.5 font-medium outline-none focus:border-amber-500/50 transition-all"
            />
          </div>

          {/* Field 4: COMISSÃO (%) */}
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">
              COMISSÃO (%)
            </label>
            <input
              type="number"
              placeholder="100"
              value={commission}
              onChange={e => setCommission(e.target.value)}
              className="w-full bg-[#242730] border border-border/40 text-foreground text-sm rounded-2xl px-4 py-3.5 font-mono font-bold outline-none focus:border-amber-500/50 transition-all"
              min="0"
              max="100"
              required
            />
          </div>

          {/* Field 5: Toggle Card ("Este profissional é um líder?") */}
          <div className="p-4 rounded-2xl bg-[#242730] border border-border/40 space-y-2 select-none">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsLeader(!isLeader)}
                className={`w-12 h-6.5 rounded-full transition-all p-0.5 cursor-pointer relative ${
                  isLeader ? 'bg-emerald-500' : 'bg-secondary'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow ${
                  isLeader ? 'translate-x-5.5' : 'translate-x-0'
                }`} />
              </button>
              <span className="font-bold text-foreground text-sm">Este profissional é um líder?</span>
            </div>
            <p className="text-xs text-muted-foreground/80 leading-relaxed pl-0.5">
              Um líder pode visualizar, agendar e gerenciar a agenda de outros profissionais.
            </p>
          </div>

          {/* Bottom Full-Width Copper/Bronze Button: SALVAR */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#B86D43] via-[#D28859] to-[#9E5732] hover:brightness-110 active:scale-[0.99] text-white font-black text-sm tracking-widest uppercase transition-all shadow-xl shadow-amber-950/40 cursor-pointer mt-4"
          >
            SALVAR
          </button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir Profissional"
        description=""
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <p className="text-foreground font-semibold">Tem certeza que deseja excluir?</p>
            <p className="text-muted-foreground text-sm mt-1">
              O profissional <span className="font-bold text-foreground">"{deleteTarget?.name}"</span> será removido permanentemente da equipe.
            </p>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 px-4 py-2.5 rounded-lg bg-secondary/80 text-foreground hover:bg-secondary border border-border/40 text-sm font-semibold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all cursor-pointer"
            >
              Sim, Excluir
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Gestão de Logins e Acessos dos Colaboradores */}
      <Modal
        isOpen={isCredentialModalOpen}
        onClose={() => setIsCredentialModalOpen(false)}
        title="🔑 Criar / Editar Login de Acesso"
        description="Defina os dados de login e o nível de permissão do barbeiro no painel."
      >
        <form onSubmit={handleSaveCredentials} className="flex flex-col gap-4 text-left pt-2">
          
          {/* Header Info Card */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#242730] border border-border/40">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 overflow-hidden">
              {credentialProf?.avatar_url ? (
                <img src={credentialProf.avatar_url} alt={credentialProf.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-amber-400" />
              )}
            </div>
            <div>
              <h4 className="font-extrabold text-foreground text-sm">{credentialProf?.name}</h4>
              <p className="text-xs text-muted-foreground">{credentialProf?.phone || 'Telefone não cadastrado'}</p>
            </div>
          </div>

          {/* Permissão de Acesso (RBAC) */}
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">
              NÍVEL DE PERMISSÃO NO PAINEL
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLoginRole('professional')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  loginRole === 'professional'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-md shadow-amber-950/20'
                    : 'bg-[#242730] border-border/40 text-muted-foreground hover:bg-[#2A2D37]'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-amber-400" /> Colaborador</span>
                  {loginRole === 'professional' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[10px] opacity-80 leading-relaxed">
                  Acesso <strong>Restrito</strong> apenas às abas de <strong>Agenda</strong> e <strong>Metas & XP</strong>.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setLoginRole('owner')}
                className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  loginRole === 'owner'
                    ? 'bg-purple-500/10 border-purple-500 text-purple-300 shadow-md shadow-purple-950/20'
                    : 'bg-[#242730] border-border/40 text-muted-foreground hover:bg-[#2A2D37]'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs">
                  <span className="flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-purple-400" /> Gestor</span>
                  {loginRole === 'owner' && <Check className="w-4 h-4 text-purple-400" />}
                </div>
                <p className="text-[10px] opacity-80 leading-relaxed">
                  Acesso <strong>Total</strong> a todo o painel (Financeiro, Clientes, Assinaturas, Estoque...).
                </p>
              </button>
            </div>
          </div>

          {/* E-mail de Login */}
          <div>
            <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-1.5">
              E-MAIL DE LOGIN DO BARBEIRO
            </label>
            <input
              type="email"
              placeholder="barbeiro@domusbarber.com"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              className="w-full bg-[#242730] border border-border/40 text-foreground text-sm rounded-2xl px-4 py-3.5 font-bold outline-none focus:border-amber-500/50 transition-all font-mono"
              required
            />
          </div>

          {/* Senha de Acesso */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block">
                SENHA DE ACESSO
              </label>
              <button
                type="button"
                onClick={handleGenerateRandomPassword}
                className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer"
              >
                ⚡ Gerar Senha
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="123456"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full bg-[#242730] border border-border/40 text-foreground text-sm rounded-2xl px-4 py-3.5 font-bold outline-none focus:border-amber-500/50 transition-all font-mono pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Link de Login Preview Card */}
          <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/30 text-xs flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Link para o Barbeiro Fazer Login:</span>
            <span className="font-mono text-amber-400 font-bold select-all break-all">https://domus-barber-pronto.vercel.app/login</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
            <button
              type="button"
              onClick={handleCopyAccess}
              className="w-full sm:w-1/2 py-3 rounded-xl border border-border/60 bg-[#242730] hover:bg-[#2F333E] text-foreground font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copiedText ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
              {copiedText ? 'Copiado!' : 'Copiar Acesso'}
            </button>

            <button
              type="button"
              onClick={handleSendWhatsAppAccess}
              className="w-full sm:w-1/2 py-3 rounded-xl border border-green-500/40 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" /> Enviar WhatsApp
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#B86D43] via-[#D28859] to-[#9E5732] hover:brightness-110 active:scale-[0.99] text-white font-black text-sm tracking-widest uppercase transition-all shadow-xl shadow-amber-950/40 cursor-pointer mt-2"
          >
            SALVAR LOGIN E PERMISSÕES
          </button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
