// app/metas/page.tsx
'use client';

import React, { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/DashboardWidgets';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';
import { db } from '../../services/db';
import { formatCurrency } from '../../lib/utils';
import { 
  Trophy, Target, Flame, Award, Sparkles, TrendingUp, 
  CheckCircle2, Star, Scissors, Package, Calendar, Coins, 
  ChevronRight, Gift, Zap, ShieldAlert, Crown, User, BookOpen, Laptop
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function MetasPage() {
  const { toast } = useToast();
  const company = db.getCurrentCompany();
  const user = db.getCurrentUser();
  const companyId = company?.id ?? 'c1111111-1111-1111-1111-111111111111';

  const [goalData, setGoalData] = useState(() => db.getBarberGoal(companyId));
  const [missions, setMissions] = useState(() => db.getDailyMissions(companyId));
  const [rewards] = useState(() => db.getRewardItems(companyId));
  const [activeTab, setActiveTab] = useState('overview');

  const handleToggleMission = (id: string) => {
    const updated = db.toggleDailyMission(companyId, id);
    setMissions(updated);

    const mission = updated.find(m => m.id === id);
    if (mission?.completed) {
      // Add XP & coins to goals
      const newXp = goalData.xp + mission.xp_reward;
      const newCoins = goalData.coins + Math.floor(mission.xp_reward / 2);
      const newGoal = { ...goalData, xp: newXp, coins: newCoins };
      setGoalData(newGoal);
      db.saveBarberGoal(newGoal);

      toast(`Missão concluída! +${mission.xp_reward} XP e +${Math.floor(mission.xp_reward / 2)} Coins adicionados!`, 'success', '🎯 Meta Batida!');
    }
  };

  const handleRedeemReward = (rewardTitle: string, cost: number) => {
    if (goalData.coins < cost) {
      toast(`Você precisa de ${cost} Coins para resgatar este item. Continue cumprindo missões!`, 'warning', 'Coins Insuficientes');
      return;
    }

    const newGoal = { ...goalData, coins: goalData.coins - cost };
    setGoalData(newGoal);
    db.saveBarberGoal(newGoal);

    toast(`Parabéns! Você resgatou: "${rewardTitle}". A equipe DOMUS entrará em contato para entrega.`, 'success', '🎁 Resgate Confirmado!');
  };

  const xpPercent = Math.min(100, Math.round((goalData.xp / goalData.next_level_xp) * 100));
  const revenuePercent = Math.min(100, Math.round((goalData.monthly_revenue_current / goalData.monthly_revenue_target) * 100));

  return (
    <DashboardLayout>
      <PageHeader
        title="Metas & Desempenho"
        description="Acompanhe suas metas mensais, evolua de nível, cumpra missões diárias e resgate prêmios."
      />

      {/* Top Banner Profile & XP Header (Mockup #1 & #3 style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 select-none">
        {/* Profile Level Card */}
        <div className="lg:col-span-1 bg-gradient-to-br from-card via-card to-amber-950/20 border border-amber-500/30 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden shadow-xl">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full border-2 border-amber-400 p-0.5 overflow-hidden shadow-lg shadow-amber-500/20">
              <img 
                src={user?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} 
                alt={user?.full_name || "Igor Ribeiro"} 
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
              PRO
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-amber-400 font-bold tracking-wider">Fala, Mestre! 👋</span>
            </div>
            <h3 className="text-lg font-black text-foreground truncate">{user?.full_name || "Igor Ribeiro"}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="primary" className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold px-2">
                <Crown className="w-3 h-3 mr-1 text-amber-400 inline" /> {goalData.level_title}
              </Badge>
            </div>
          </div>
        </div>

        {/* Level XP Progress Display */}
        <div className="lg:col-span-2 bg-gradient-to-r from-card to-secondary/40 border border-border/60 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg shadow-inner">
                {goalData.level}
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Nível Atual</span>
                <span className="text-sm font-black text-foreground">NÍVEL {goalData.level} — {goalData.level_title}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-black text-amber-400">{goalData.xp.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground font-mono"> / {goalData.next_level_xp.toLocaleString()} XP</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Faltam <strong className="text-amber-400 font-bold">{(goalData.next_level_xp - goalData.xp).toLocaleString()} XP</strong> para o próximo nível 🚀
              </p>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-secondary/80 h-3 rounded-full overflow-hidden p-0.5 border border-border/40">
              <motion.div 
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full shadow-lg shadow-amber-500/40"
                initial={{ width: 0 }}
                animate={{ width: `${xpPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row (Matching Mockups #1, #3 & #4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 select-none">
        {/* Faturamento do Mês */}
        <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Faturamento do Mês</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-foreground font-mono">{formatCurrency(goalData.monthly_revenue_current)}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-green-400 font-bold mt-0.5">
              <TrendingUp className="w-3 h-3" /> +12,4% em relação ao mês anterior
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border/30">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Meta: {formatCurrency(goalData.monthly_revenue_target)}</span>
              <span className="font-bold text-amber-400">{revenuePercent}%</span>
            </div>
            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full" style={{ width: `${revenuePercent}%` }} />
            </div>
          </div>
        </div>

        {/* Posição no Ranking */}
        <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Posição no Ranking</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-amber-400 font-mono">{goalData.ranking_position}º lugar</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Entre 128 barbeiros da rede</p>
          </div>
          <button onClick={() => setActiveTab('ranking')} className="mt-3 text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer">
            Ver ranking completo <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Sequência Atual (Streak) */}
        <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sequência Atual</span>
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-orange-400 font-mono">{goalData.streak_days} dias</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Batendo meta diária ininterrupta 🔥</p>
          </div>
          <span className="mt-3 text-[10px] font-bold text-muted-foreground">Recorde da barbearia!</span>
        </div>

        {/* Índice DOMUS (Gauge) */}
        <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Índice DOMUS</span>
            <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-green-400 font-mono">{goalData.domus_index}</span>
            <span className="text-[10px] text-muted-foreground font-mono">/ 1000</span>
          </div>
          <div className="flex items-center justify-between text-[10px] mt-2">
            <span className="text-green-400 font-extrabold flex items-center gap-1">
              <Star className="w-3 h-3 fill-green-400 text-green-400" /> Excelente
            </span>
            <span className="text-muted-foreground">Top 5%</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-card border border-border/40 p-1 rounded-xl">
          <TabsTrigger value="overview" className="gap-2 text-xs font-bold">
            <Target className="w-4 h-4" /> Visão Geral & Missões
          </TabsTrigger>
          <TabsTrigger value="store" className="gap-2 text-xs font-bold">
            <Coins className="w-4 h-4 text-amber-400" /> Loja de Recompensas ({goalData.coins} Coins)
          </TabsTrigger>
          <TabsTrigger value="ranking" className="gap-2 text-xs font-bold">
            <Trophy className="w-4 h-4 text-yellow-400" /> Ranking da Barbearia
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: VISÃO GERAL & MISSÕES */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Meta Mensal Card (Donut + Breakdown) */}
            <Card className="border border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Meta Mensal</span>
                  <span className="text-xs text-muted-foreground font-normal">Período: 01/07 a 31/07</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {/* Donut percentage display */}
                <div className="flex items-center justify-center p-4 bg-secondary/20 rounded-2xl border border-border/30">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-secondary stroke-current"
                        strokeWidth="3.5"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-amber-400 stroke-current"
                        strokeDasharray={`${revenuePercent}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center text-center">
                      <span className="text-2xl font-black text-amber-400 font-mono">{revenuePercent}%</span>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold">da meta</span>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col gap-1 text-left">
                    <span className="text-xs text-muted-foreground">Faltam apenas</span>
                    <span className="text-sm font-black text-amber-400 font-mono">
                      {formatCurrency(goalData.monthly_revenue_target - goalData.monthly_revenue_current)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">para bater sua meta Ouro! 🚀</span>
                  </div>
                </div>

                {/* Sub-goals breakdown */}
                <div className="space-y-3">
                  {/* Cortes */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Scissors className="w-3.5 h-3.5 text-primary" /> Cortes Realizados
                      </span>
                      <span className="font-bold text-foreground font-mono">
                        {goalData.monthly_cuts_current} / {goalData.monthly_cuts_target}
                      </span>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${(goalData.monthly_cuts_current / goalData.monthly_cuts_target) * 100}%` }} />
                    </div>
                  </div>

                  {/* Produtos */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-primary" /> Vendas de Produtos
                      </span>
                      <span className="font-bold text-foreground font-mono">
                        {formatCurrency(goalData.monthly_products_current)} / {formatCurrency(goalData.monthly_products_target)}
                      </span>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${(goalData.monthly_products_current / goalData.monthly_products_target) * 100}%` }} />
                    </div>
                  </div>

                  {/* Avaliações */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-primary" /> Avaliações 5 Estrelas
                      </span>
                      <span className="font-bold text-foreground font-mono">
                        {goalData.monthly_reviews_current} / {goalData.monthly_reviews_target}
                      </span>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${(goalData.monthly_reviews_current / goalData.monthly_reviews_target) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Missões do Dia (Interactive List matching Mockup #1 & #3) */}
            <Card className="border border-border/60">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-red-400" /> Missões do Dia
                  </CardTitle>
                  <CardDescription className="text-[10px]">Atualiza em: <span className="text-green-400 font-mono font-bold">08:24:51</span></CardDescription>
                </div>
                <Badge variant="primary" className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                  +XP Diário
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {missions.map((m) => (
                  <div 
                    key={m.id}
                    onClick={() => handleToggleMission(m.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      m.completed 
                        ? 'bg-green-500/10 border-green-500/30 text-muted-foreground' 
                        : 'bg-secondary/20 border-border/40 hover:border-amber-500/40 hover:bg-secondary/40'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-bold ${m.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {m.title}
                        </span>
                        <span className="text-[10px] font-bold text-purple-400 font-mono">+{m.xp_reward} XP</span>
                      </div>
                      
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mb-1">
                        <div 
                          className={`h-full rounded-full ${m.completed ? 'bg-green-400' : 'bg-purple-500'}`} 
                          style={{ width: `${(m.current / m.target) * 100}%` }} 
                        />
                      </div>
                      
                      <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                        <span>Progresso: {m.current}/{m.target}</span>
                        <span>{m.completed ? 'Concluído ✅' : 'Clique para atualizar'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Dica da IA & Próximo Nível (Right Column matching Mockups) */}
            <div className="flex flex-col gap-6">
              {/* Dica da IA */}
              <Card className="border border-purple-500/30 bg-gradient-to-br from-purple-950/20 to-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-purple-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" /> DICA DA IA DOMUS
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground leading-relaxed">
                  <p className="mb-3 text-foreground font-semibold">
                    "Para bater sua meta mensal Ouro, você precisa faturar mais R$ 1.850. Que tal oferecer o combo barba + hidratação para 5 clientes hoje? 💡"
                  </p>
                  <Button variant="outline" className="w-full text-xs text-purple-300 border-purple-500/30 hover:bg-purple-500/10">
                    Quero bater minha meta! 🚀
                  </Button>
                </CardContent>
              </Card>

              {/* Próximas Recompensas ao Subir de Nível */}
              <Card className="border border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-400" /> RECOMPENSAS AO SUBIR DE NÍVEL
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Dinheiro', desc: 'R$ 250,00', icon: <Coins className="w-4 h-4 text-green-400" /> },
                    { label: 'Cursos', desc: 'Curso liberado', icon: <BookOpen className="w-4 h-4 text-blue-400" /> },
                    { label: 'Cashback', desc: 'Pontos duplos', icon: <Zap className="w-4 h-4 text-amber-400" /> },
                    { label: 'Badge', desc: 'Master Especial', icon: <Trophy className="w-4 h-4 text-purple-400" /> },
                  ].map((r, i) => (
                    <div key={i} className="p-3 bg-secondary/20 border border-border/30 rounded-xl flex flex-col gap-1 text-left">
                      <div className="flex items-center gap-1.5">{r.icon}<span className="text-[10px] font-bold text-foreground">{r.label}</span></div>
                      <span className="text-[9px] text-muted-foreground">{r.desc}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

          </div>
        </TabsContent>

        {/* TAB 2: LOJA DE RECOMPENSAS (Matching Mockups #1 & #3) */}
        <TabsContent value="store">
          <Card className="border border-border/60 mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/20">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Coins className="w-5 h-5 text-amber-400" /> Loja de Recompensas DOMUS
                </CardTitle>
                <CardDescription>Troque seus Coins acumulados por prêmios reais, cursos e cashback na conta!</CardDescription>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 font-mono font-black text-sm">
                <Coins className="w-4 h-4" /> {goalData.coins.toLocaleString()} Coins Disponíveis
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards.map((rw) => (
                  <div 
                    key={rw.id}
                    className="p-5 rounded-2xl border border-border/60 bg-card/80 flex flex-col justify-between gap-4 hover:border-amber-500/40 transition-all group relative overflow-hidden"
                  >
                    {rw.badge && (
                      <span className="absolute top-3 right-3 bg-green-500/20 text-green-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-green-500/30">
                        {rw.badge}
                      </span>
                    )}

                    <div className="flex flex-col gap-2">
                      <div className="w-12 h-12 rounded-xl bg-secondary/60 border border-border/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                        {rw.category === 'money' && <Coins className="w-6 h-6 text-green-400" />}
                        {rw.category === 'equipment' && <Scissors className="w-6 h-6 text-amber-400" />}
                        {rw.category === 'course' && <BookOpen className="w-6 h-6 text-blue-400" />}
                        {rw.category === 'ticket' && <Gift className="w-6 h-6 text-purple-400" />}
                      </div>

                      <h4 className="font-bold text-foreground text-sm">{rw.title}</h4>
                      <div className="flex items-center gap-1 text-amber-400 font-mono font-black text-xs">
                        <Coins className="w-3.5 h-3.5" /> {rw.coins_cost.toLocaleString()} Coins
                      </div>
                    </div>

                    <Button 
                      onClick={() => handleRedeemReward(rw.title, rw.coins_cost)}
                      disabled={goalData.coins < rw.coins_cost}
                      className="w-full text-xs font-bold"
                    >
                      {goalData.coins >= rw.coins_cost ? 'Resgatar Prêmio' : 'Coins Insuficientes'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: RANKING DA BARBEARIA */}
        <TabsContent value="ranking">
          <Card className="border border-border/60">
            <CardHeader className="border-b border-border/20 pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="w-5 h-5 text-yellow-400" /> Ranking Semanal de Barbeiros
              </CardTitle>
              <CardDescription>Os profissionais que mais faturam e cumprem metas entram para o Hall da Fama.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {[
                  { pos: 1, name: 'Enzo Romano', role: 'Fade Master', xp: '12.450 XP', revenue: 'R$ 9.850', badge: '🥇 1º Lugar' },
                  { pos: 2, name: user?.full_name || 'Igor Ribeiro', role: 'Master Barber', xp: '8.450 XP', revenue: 'R$ 8.730', badge: '🥈 2º Lugar (Você)' },
                  { pos: 3, name: 'Thiago Silva', role: 'Barber Pro', xp: '7.200 XP', revenue: 'R$ 6.400', badge: '🥉 3º Lugar' },
                  { pos: 4, name: 'Gustavo Santos', role: 'Barbeiro Junior', xp: '5.100 XP', revenue: 'R$ 4.900', badge: 'Top 10' }
                ].map((b) => (
                  <div 
                    key={b.pos}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                      b.pos === 2 
                        ? 'bg-amber-500/10 border-amber-500/40 text-foreground font-bold' 
                        : 'bg-secondary/20 border-border/30 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-black text-lg w-6 text-center">{b.pos}º</span>
                      <div>
                        <h4 className="font-bold text-foreground text-sm">{b.name}</h4>
                        <span className="text-[10px] text-muted-foreground">{b.role}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs font-mono">
                      <div className="text-right">
                        <span className="block font-bold text-foreground">{b.revenue}</span>
                        <span className="text-[10px] text-amber-400">{b.xp}</span>
                      </div>
                      <Badge variant="primary" className="text-[9px] px-2.5 py-1">
                        {b.badge}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
