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
import { Plus, User, Percent, Pencil, Trash2, AlertTriangle, Camera } from 'lucide-react';

export default function ProfissionaisPage() {
  const { toast } = useToast();
  const company = db.getCurrentCompany();
  const companyId = company?.id;

  const [professionals, setProfessionals] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProf, setEditingProf] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

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
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
    </DashboardLayout>
  );
}
