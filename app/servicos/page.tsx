// app/servicos/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/DashboardWidgets';
import { SearchBar } from '../../components/ui/DataTable';
import { db } from '../../services/db';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import { Input, Textarea } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { Plus, Scissors, Clock, DollarSign, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export default function ServicosPage() {
  const { toast } = useToast();
  const company = db.getCurrentCompany();
  const companyId = company?.id;

  const [services, setServices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(() => {
    if (companyId) setServices(db.getServices(companyId));
  }, [companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAddModal = () => {
    setEditingService(null);
    setName(''); setDescription(''); setDuration('30'); setPrice('');
    setIsModalOpen(true);
  };

  const openEditModal = (svc: any) => {
    setEditingService(svc);
    setName(svc.name);
    setDescription(svc.description || '');
    setDuration(String(svc.duration_minutes));
    setPrice(String(svc.price));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!name || !duration || !price) {
      toast('Nome, Duração e Preço são obrigatórios.', 'warning', 'Atenção');
      return;
    }

    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 400));

    const allServices = db.getServices(companyId!);

    if (editingService) {
      // Edit existing
      const updated = allServices.map(s =>
        s.id === editingService.id
          ? { ...s, name, description: description || null, duration_minutes: Number(duration), price: Number(price), updated_at: new Date().toISOString() }
          : s
      );
      db.saveServices(updated);
      toast('Serviço atualizado com sucesso!', 'success', 'Sucesso');
      db.logAudit(company.id, db.getCurrentUser()?.id || null, 'service_updated', { name });
    } else {
      // Create new
      const newService = {
        id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        company_id: company.id,
        name,
        description: description || null,
        duration_minutes: Number(duration),
        price: Number(price),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.saveServices([...allServices, newService]);
      toast('Serviço adicionado ao catálogo!', 'success', 'Sucesso');
      db.logAudit(company.id, db.getCurrentUser()?.id || null, 'service_created', { name, price });
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = () => {
    if (!deleteTarget || !companyId) return;
    const all = db.getServices(companyId);
    db.saveServices(all.filter(s => s.id !== deleteTarget.id));
    db.logAudit(companyId, db.getCurrentUser()?.id || null, 'service_deleted', { name: deleteTarget.name });
    toast(`Serviço "${deleteTarget.name}" excluído.`, 'success', 'Excluído');
    setDeleteTarget(null);
    loadData();
  };

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Catálogo de Serviços"
        description="Gerencie os procedimentos realizados pela barbearia e seus respectivos preços."
        actions={
          <Button onClick={openAddModal} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Adicionar Serviço
          </Button>
        }
      />

      <div className="mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar serviço por nome ou descrição..."
          className="max-w-md w-full"
        />
      </div>

      {/* Custom table with delete/edit buttons */}
      <Card className="border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-secondary/20">
                <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Nome do Serviço</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Descrição</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Duração</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground">
                    <Scissors className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-semibold">Nenhum serviço cadastrado</p>
                    <p className="text-xs mt-1 opacity-60">Clique em "Adicionar Serviço" para começar.</p>
                  </td>
                </tr>
              ) : (
                filteredServices.map(svc => (
                  <tr key={svc.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                          <Scissors className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-foreground">{svc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-muted-foreground/80 text-xs line-clamp-1 max-w-xs">{svc.description || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        {svc.duration_minutes} min
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-extrabold text-foreground">{formatCurrency(svc.price)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={svc.is_active ? 'success' : 'outline'}>
                        {svc.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(svc)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                          title="Editar serviço"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(svc)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                          title="Excluir serviço"
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
        {filteredServices.length > 0 && (
          <div className="px-4 py-3 border-t border-border/30 text-xs text-muted-foreground">
            Mostrando <span className="font-bold text-primary">{filteredServices.length}</span> {filteredServices.length === 1 ? 'registro' : 'registros'}
          </div>
        )}
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'Editar Serviço' : 'Adicionar Serviço'}
        description={editingService ? 'Atualize os dados do serviço.' : 'Cadastre um novo serviço para a agenda do Domus Barber.'}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Input
            type="text"
            label="Nome do Serviço *"
            placeholder="Ex: Corte Degradê Navalhado"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
          <Textarea
            label="Descrição do Serviço"
            placeholder="Ex: Corte com acabamento na navalha..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label="Duração (Minutos) *"
              placeholder="30"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              icon={<Clock className="w-4 h-4 text-muted-foreground/60" />}
              min="5"
              max="240"
            />
            <Input
              type="number"
              label="Valor (R$) *"
              placeholder="50.00"
              value={price}
              onChange={e => setPrice(e.target.value)}
              icon={<DollarSign className="w-4 h-4 text-muted-foreground/60" />}
              min="0"
              step="0.01"
            />
          </div>
          <Button type="submit" isLoading={isSubmitting} className="w-full mt-4">
            {editingService ? 'Salvar Alterações' : 'Salvar Serviço no Catálogo'}
          </Button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir Serviço"
        description=""
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <p className="text-foreground font-semibold">Tem certeza que deseja excluir?</p>
            <p className="text-muted-foreground text-sm mt-1">
              O serviço <span className="font-bold text-foreground">"{deleteTarget?.name}"</span> será removido permanentemente do catálogo.
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
