// app/estoque/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader, MetricCard } from '../../components/ui/DashboardWidgets';
import Modal from '../../components/ui/Modal';
import { Input, Textarea } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import Select from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import { db } from '../../services/db';
import { formatCurrency } from '../../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Plus, Package, DollarSign, AlertTriangle, TrendingDown,
  Search, ArrowUpCircle, ArrowDownCircle, Archive,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Product, StockMovement } from '../../types';

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  in: 'Entrada',
  out: 'Saída',
};

const REASON_LABELS: Record<string, string> = {
  purchase: 'Compra',
  sale: 'Venda',
  adjustment: 'Ajuste',
  damage: 'Perda / Dano',
  use: 'Uso em Serviço',
};

export default function EstoquePage() {
  const { toast } = useToast();
  const company = db.getCurrentCompany();

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'ok'>('all');

  // Add Product Modal
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [fName, setFName] = useState('');
  const [fSku, setFSku] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fCost, setFCost] = useState('');
  const [fPrice, setFPrice] = useState('');
  const [fQty, setFQty] = useState('10');
  const [fMinQty, setFMinQty] = useState('5');
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Stock Movement Modal
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movProduct, setMovProduct] = useState<Product | null>(null);
  const [movType, setMovType] = useState<'in' | 'out'>('in');
  const [movQty, setMovQty] = useState('1');
  const [movReason, setMovReason] = useState<'purchase' | 'sale' | 'adjustment' | 'damage' | 'use'>('purchase');
  const [movCost, setMovCost] = useState('');
  const [isSubmittingMov, setIsSubmittingMov] = useState(false);

  const companyId = company?.id;

  const loadData = useCallback(() => {
    if (!companyId) return;
    setProducts(db.getProducts(companyId));
    setMovements(db.getStockMovements(companyId));
  }, [companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock_qty <= p.min_stock_qty),
    [products]
  );

  const totalValue = useMemo(
    () => products.reduce((s, p) => s + p.stock_qty * (p.cost_price ?? p.price), 0),
    [products]
  );

  const filteredProducts = useMemo(() => {
    let list = products;
    if (stockFilter === 'low') list = list.filter((p) => p.stock_qty <= p.min_stock_qty);
    else if (stockFilter === 'ok') list = list.filter((p) => p.stock_qty > p.min_stock_qty);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    }
    return list;
  }, [products, stockFilter, search]);

  const marginData = useMemo(() =>
    products
      .filter((p) => p.cost_price)
      .map((p) => ({
        name: p.name.slice(0, 15) + (p.name.length > 15 ? '...' : ''),
        margem: Math.round(((p.price - (p.cost_price ?? 0)) / p.price) * 100),
      }))
      .sort((a, b) => b.margem - a.margem)
      .slice(0, 8),
    [products]
  );

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!fName || !fPrice || !fQty) {
      toast('Nome, preço e quantidade são obrigatórios.', 'warning', 'Atenção');
      return;
    }
    setIsSubmittingProduct(true);

    const newProduct: Product = {
      id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: company.id,
      name: fName,
      sku: fSku || null,
      description: fDesc || null,
      cost_price: fCost ? Number(fCost) : null,
      price: Number(fPrice),
      stock_qty: Number(fQty),
      min_stock_qty: Number(fMinQty),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const all = db.getAllProductsRaw();
    db.saveProducts([...all, newProduct]);

    // Register initial stock movement
    const mov: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: company.id,
      product_id: newProduct.id,
      type: 'in',
      quantity: Number(fQty),
      reason: 'purchase',
      unit_cost: fCost ? Number(fCost) : null,
      created_at: new Date().toISOString(),
      created_by: db.getCurrentUser()?.id ?? null,
    };
    db.addStockMovement(mov);

    db.logAudit(company.id, db.getCurrentUser()?.id ?? null, 'product_created', { name: fName });
    loadData();

    setIsSubmittingProduct(false);
    setIsAddProductOpen(false);
    setFName(''); setFSku(''); setFDesc(''); setFCost(''); setFPrice(''); setFQty('10'); setFMinQty('5');
    toast('Produto cadastrado no inventário!', 'success', 'Sucesso');
  };

  const openMovement = (product: Product, type: 'in' | 'out') => {
    setMovProduct(product);
    setMovType(type);
    setMovQty('1');
    setMovReason(type === 'in' ? 'purchase' : 'sale');
    setMovCost('');
    setIsMovementOpen(true);
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !movProduct) return;
    const qty = Number(movQty);
    if (qty <= 0) {
      toast('Quantidade deve ser maior que zero.', 'warning', 'Atenção');
      return;
    }
    if (movType === 'out' && qty > movProduct.stock_qty) {
      toast('Quantidade maior que o estoque disponível.', 'error', 'Estoque insuficiente');
      return;
    }
    setIsSubmittingMov(true);

    const mov: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      company_id: company.id,
      product_id: movProduct.id,
      type: movType,
      quantity: qty,
      reason: movReason,
      unit_cost: movCost ? Number(movCost) : null,
      created_at: new Date().toISOString(),
      created_by: db.getCurrentUser()?.id ?? null,
    };

    db.addStockMovement(mov);

    const updatedProduct: Product = {
      ...movProduct,
      stock_qty: movType === 'in' ? movProduct.stock_qty + qty : movProduct.stock_qty - qty,
      updated_at: new Date().toISOString(),
    };
    db.updateProduct(updatedProduct);
    loadData();

    setIsSubmittingMov(false);
    setIsMovementOpen(false);
    const action = movType === 'in' ? 'entrada' : 'saída';
    toast(`${qty} un. de ${movProduct.name} registrado(a) com ${action}!`, 'success', 'Movimentação');
  };

  const tooltipStyle = { backgroundColor: '#161D2E', border: '1px solid #1E293B', borderRadius: 8, color: '#f8fafc' };

  return (
    <DashboardLayout>
      <PageHeader
        title="Controle de Estoque"
        description="Gerencie produtos, movimentações e inventário da barbearia."
        actions={
          <Button onClick={() => setIsAddProductOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo Produto
          </Button>
        }
      />

      {/* Low stock alert */}
      {lowStockProducts.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 mb-6">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-400">
              {lowStockProducts.length} produto{lowStockProducts.length > 1 ? 's' : ''} com estoque abaixo do mínimo
            </p>
            <p className="text-xs text-red-400/70">
              {lowStockProducts.map((p) => p.name).join(', ')}
            </p>
          </div>
          <button onClick={() => setStockFilter('low')} className="text-xs text-red-400 font-bold underline hover:no-underline">
            Ver todos
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Total de Produtos" value={String(products.length)} icon={<Package className="w-5 h-5 text-primary" />} />
        <MetricCard title="Valor em Estoque" value={formatCurrency(totalValue)} icon={<DollarSign className="w-5 h-5 text-primary" />} />
        <MetricCard title="Estoque Baixo" value={String(lowStockProducts.length)} icon={<AlertTriangle className="w-5 h-5 text-red-400" />} />
        <MetricCard title="Movimentações" value={String(movements.length)} icon={<TrendingDown className="w-5 h-5 text-primary" />} />
      </div>

      <Tabs defaultValue="produtos">
        <TabsList className="mb-6">
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        {/* Produtos Tab */}
        <TabsContent value="produtos">
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full pl-9 pr-4 py-2.5 bg-secondary/30 border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-all"
              />
            </div>
            <div className="flex gap-2">
              {[{ v: 'all', l: 'Todos' }, { v: 'low', l: 'Baixo' }, { v: 'ok', l: 'OK' }].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setStockFilter(opt.v as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    stockFilter === opt.v
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary/30 border-border/60 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Package className="w-10 h-10 text-muted-foreground/20 mb-4" />
              <h3 className="font-bold text-foreground mb-1">Nenhum produto encontrado</h3>
              <p className="text-sm text-muted-foreground">Cadastre produtos para gerenciar seu estoque.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const isLow = product.stock_qty <= product.min_stock_qty;
                const stockPercent = Math.min(100, (product.stock_qty / Math.max(product.min_stock_qty * 2, 1)) * 100);
                return (
                  <Card key={product.id} className="border border-border/40 hover:border-border/70 transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground text-sm truncate">{product.name}</h3>
                          {product.sku && <span className="text-[10px] text-muted-foreground font-mono bg-secondary/60 px-1.5 py-0.5 rounded">{product.sku}</span>}
                        </div>
                        {isLow && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                      </div>

                      {/* Stock bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Estoque: <span className={`font-bold ${isLow ? 'text-red-400' : 'text-foreground'}`}>{product.stock_qty} un.</span></span>
                          <span>Mín: {product.min_stock_qty} un.</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isLow ? 'bg-red-500' : stockPercent < 50 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${stockPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Prices */}
                      <div className="flex justify-between text-xs mb-4">
                        <div>
                          <p className="text-muted-foreground">Custo</p>
                          <p className="font-bold text-foreground">{product.cost_price ? formatCurrency(product.cost_price) : '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">Venda</p>
                          <p className="font-bold text-primary">{formatCurrency(product.price)}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openMovement(product, 'in')}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-all"
                        >
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                          Entrada
                        </button>
                        <button
                          onClick={() => openMovement(product, 'out')}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all"
                        >
                          <ArrowDownCircle className="w-3.5 h-3.5" />
                          Saída
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Movimentações Tab */}
        <TabsContent value="movimentacoes">
          {movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Archive className="w-10 h-10 text-muted-foreground/20 mb-4" />
              <h3 className="font-bold text-foreground mb-1">Nenhuma movimentação</h3>
              <p className="text-sm text-muted-foreground">As entradas e saídas de estoque aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...movements].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((mov) => (
                <div key={mov.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/40 hover:border-border/70 transition-all">
                  <div className={`p-2.5 rounded-xl shrink-0 ${mov.type === 'in' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    {mov.type === 'in'
                      ? <ArrowUpCircle className="w-4 h-4 text-green-400" />
                      : <ArrowDownCircle className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{mov.product?.name ?? 'Produto'}</p>
                    <p className="text-xs text-muted-foreground">{REASON_LABELS[mov.reason] ?? mov.reason}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`font-bold text-sm ${mov.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                      {mov.type === 'in' ? '+' : '-'}{mov.quantity} un.
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(mov.created_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Relatórios Tab */}
        <TabsContent value="relatorios">
          <div className="space-y-6">
            {/* Inventory Value Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border border-border/40 p-5 text-left">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Valor de Custo Total</p>
                <p className="text-2xl font-extrabold text-foreground">{formatCurrency(totalValue)}</p>
              </Card>
              <Card className="border border-border/40 p-5 text-left">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Valor de Venda Total</p>
                <p className="text-2xl font-extrabold text-primary">{formatCurrency(products.reduce((s, p) => s + p.stock_qty * p.price, 0))}</p>
              </Card>
              <Card className="border border-border/40 p-5 text-left">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-2">Produtos em Estoque Baixo</p>
                <p className="text-2xl font-extrabold text-red-400">{lowStockProducts.length}</p>
              </Card>
            </div>

            {/* Margin chart */}
            {marginData.length > 0 && (
              <Card className="border border-border/40">
                <CardHeader className="border-b border-border/20 pb-3 mb-4">
                  <CardTitle className="text-sm">Margem de Lucro por Produto (%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="99%" height={200} minWidth={0}>
                    <BarChart data={marginData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} unit="%" />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} width={100} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}%`, 'Margem']} />
                      <Bar dataKey="margem" fill="#F59E0B" radius={[0, 4, 4, 0]} name="Margem" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Product Modal */}
      <Modal isOpen={isAddProductOpen} onClose={() => setIsAddProductOpen(false)} title="Novo Produto" description="Cadastre um produto no inventário.">
        <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
          <Input label="Nome do Produto *" placeholder="Ex: Pomada Matte 150g" value={fName} onChange={(e) => setFName(e.target.value)} autoFocus />
          <Input label="SKU / Código" placeholder="POM-MAT-150" value={fSku} onChange={(e) => setFSku(e.target.value)} icon={<Archive className="w-4 h-4 text-muted-foreground/60" />} />
          <Textarea label="Descrição" placeholder="Descreva o produto..." value={fDesc} onChange={(e) => setFDesc(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" label="Preço Custo (R$)" placeholder="25.00" value={fCost} onChange={(e) => setFCost(e.target.value)} min="0" step="0.01" />
            <Input type="number" label="Preço Venda (R$) *" placeholder="60.00" value={fPrice} onChange={(e) => setFPrice(e.target.value)} min="0" step="0.01" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" label="Qtd. Inicial *" placeholder="10" value={fQty} onChange={(e) => setFQty(e.target.value)} min="0" />
            <Input type="number" label="Qtd. Mínima" placeholder="5" value={fMinQty} onChange={(e) => setFMinQty(e.target.value)} min="0" />
          </div>
          <Button type="submit" isLoading={isSubmittingProduct} className="w-full mt-2">Salvar Produto</Button>
        </form>
      </Modal>

      {/* Stock Movement Modal */}
      <Modal isOpen={isMovementOpen} onClose={() => setIsMovementOpen(false)} title={`${movType === 'in' ? 'Entrada' : 'Saída'} de Estoque`} description={movProduct?.name ?? ''}>
        <form onSubmit={handleMovement} className="flex flex-col gap-4">
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 text-xs">
            <span className="text-muted-foreground">Estoque atual: </span>
            <span className="font-bold text-foreground">{movProduct?.stock_qty ?? 0} un.</span>
          </div>
          <Input type="number" label="Quantidade *" placeholder="1" value={movQty} onChange={(e) => setMovQty(e.target.value)} min="1" autoFocus />
          <Select
            label="Motivo"
            value={movReason}
            onChange={(e) => setMovReason(e.target.value as any)}
            options={
              movType === 'in'
                ? [
                    { value: 'purchase', label: 'Compra' },
                    { value: 'adjustment', label: 'Ajuste de Inventário' },
                  ]
                : [
                    { value: 'sale', label: 'Venda' },
                    { value: 'use', label: 'Uso em Serviço' },
                    { value: 'damage', label: 'Perda / Dano' },
                    { value: 'adjustment', label: 'Ajuste de Inventário' },
                  ]
            }
          />
          {movType === 'in' && (
            <Input type="number" label="Custo Unitário (R$)" placeholder="0.00" value={movCost} onChange={(e) => setMovCost(e.target.value)} min="0" step="0.01" />
          )}
          <Button type="submit" isLoading={isSubmittingMov} className="w-full mt-2">
            Confirmar {movType === 'in' ? 'Entrada' : 'Saída'}
          </Button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
