// app/assinatura/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { db } from '../../services/db';
import { formatCurrency } from '../../lib/utils';
import { 
  Crown, CheckCircle2, Scissors, Calendar, ShieldCheck, 
  HelpCircle, ChevronDown, ChevronUp, Star, Award, Coins, 
  ArrowRight, User, Heart, Sparkles, MapPin, Gift, Zap
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import Badge from '../../components/ui/Badge';

export default function PublicClientSubscriptionPage() {
  const { toast } = useToast();
  const company = db.getCurrentCompany();
  const user = db.getCurrentUser();
  const plans = db.getClientSubscriptionPlans(company?.id ?? 'c1111111-1111-1111-1111-111111111111');

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const handleSubscribe = (planName: string, price: number) => {
    toast(`Redirecionando para o checkout seguro do plano ${planName} (${formatCurrency(price)}/mês)...`, 'success', '👑 Clube Domus');
    setTimeout(() => {
      window.location.href = `/agendar/${company?.slug || 'domus-barbershop'}`;
    }, 1500);
  };

  const faqs = [
    {
      q: 'Posso usar meu plano em qualquer barbearia parceira?',
      a: 'Sim! A assinatura Domus permite que você agende seu corte no estabelecimento principal e em todas as unidades parceiras da rede com total liberdade.'
    },
    {
      q: 'Posso cancelar minha assinatura a qualquer momento?',
      a: 'Com certeza! Nossos planos são mensais e sem fidelidade. Você cancela com apenas 1 clique a qualquer momento sem nenhuma multa.'
    },
    {
      q: 'Quantas vezes posso cortar por mês?',
      a: 'Nos planos PRO e PREMIUM você tem cortes ilimitados durante o mês respeitando apenas o intervalo mínimo recomendado para a saúde da pele.'
    },
    {
      q: 'Como funciona o acúmulo de pontos/Coins?',
      a: 'A cada renovação e agendamento você ganha Coins que podem ser trocados por produtos grátis, descontos em balcão e prêmios na loja.'
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden select-none">
      {/* Glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.12)_0%,transparent_70%)] pointer-events-none" />

      {/* Header */}
      <header className="h-20 border-b border-border/40 bg-card/65 backdrop-blur-md flex items-center justify-between px-6 md:px-12 relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-primary/30 shadow-md shadow-primary/20 bg-black flex items-center justify-center">
            <img src="/logo.jpg" alt="DOMUS BARBER CLUB" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-black tracking-wider text-xs text-primary leading-tight">
              DOMUS BARBER
            </span>
            <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
              BARBER CLUB
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-mono font-bold text-amber-400">
            <Coins className="w-4 h-4" /> Meus pontos: 2.450 Coins
          </div>
          <Link href="/dashboard" className="w-9 h-9 rounded-full overflow-hidden border border-border/80">
            <img src={user?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} alt="Perfil" className="w-full h-full object-cover" />
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 flex flex-col gap-12 relative z-10">

        {/* Hero Section (Matching Mockup #2) */}
        <div className="relative rounded-3xl border border-amber-500/30 bg-gradient-to-r from-card via-card to-amber-950/20 p-8 md:p-12 overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col gap-4 text-left max-w-xl">
            <div className="flex items-center gap-2">
              <Badge variant="primary" className="bg-amber-500/10 text-amber-400 border-amber-500/30 px-3 py-1 font-bold text-xs uppercase tracking-wider">
                <Crown className="w-3.5 h-3.5 mr-1 inline" /> Assinante Domus
              </Badge>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-foreground">
              Corte quando quiser. <br />
              <span className="text-amber-400">Com quem quiser.</span>
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Um plano. Liberdade total. Mantenha seu visual alinhado sem precisar pagar a cada atendimento.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {[
                'Cancele quando quiser',
                'Sem fidelidade',
                'Assinou, cortou! Simples assim'
              ].map((perk, i) => (
                <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/60 border border-border/40 text-[11px] font-semibold text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> {perk}
                </div>
              ))}
            </div>
          </div>

          <div className="relative shrink-0 w-full md:w-80 h-56 rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600" 
              alt="Corte Barbearia" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Qualidade Premium Garantida
              </span>
            </div>
          </div>
        </div>

        {/* Como Funciona? Diagram */}
        <div className="flex flex-col gap-6 text-center">
          <h2 className="text-xl font-bold text-foreground">Como funciona?</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Escolha o plano', desc: 'Selecione a opção ideal para seu estilo.' },
              { step: '2', title: 'Agende pelo app', desc: 'Escolha os dias e horários livres.' },
              { step: '3', title: 'Vá na barbearia', desc: 'Atendimento VIP sem pagar no balcão.' },
              { step: '4', title: 'Repita quantas vezes quiser', desc: 'Cabelo alinhado durante todo o mês.' },
            ].map((s) => (
              <div key={s.step} className="p-5 rounded-2xl bg-card border border-border/50 flex flex-col items-center gap-2 text-center">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-xs">
                  {s.step}
                </div>
                <h4 className="font-bold text-foreground text-xs">{s.title}</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Planos Selector Grid (Matching Mockup #2) */}
        <div className="flex flex-col gap-6 text-center">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">Valores e Assinaturas</span>
            <h2 className="text-2xl md:text-3xl font-black text-foreground">Escolha seu plano</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => {
              const isSelected = selectedPlan === p.id || (selectedPlan === null && p.is_popular);

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`p-6 rounded-3xl border flex flex-col justify-between text-left transition-all cursor-pointer relative bg-card ${
                    p.is_popular 
                      ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-2xl shadow-amber-500/10' 
                      : 'border-border/60 hover:border-amber-500/30'
                  }`}
                >
                  {p.is_popular && (
                    <Badge variant="primary" className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white font-bold text-[9px] px-3 py-1 shadow">
                      Mais Escolhido
                    </Badge>
                  )}

                  <div>
                    <h3 className="text-lg font-black text-foreground uppercase tracking-wider">{p.name}</h3>
                    <p className="text-xs text-muted-foreground min-h-[32px] my-2">{p.description}</p>
                    
                    <div className="flex items-baseline gap-1 my-4">
                      <span className="text-3xl font-black text-foreground font-mono">{formatCurrency(p.price)}</span>
                      <span className="text-xs text-muted-foreground">/mês</span>
                    </div>

                    <div className="w-full border-t border-border/40 my-4" />

                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-3">Inclui:</span>

                    <ul className="space-y-2.5 mb-6 text-xs text-muted-foreground">
                      {p.perks.map((perk, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSubscribe(p.name, p.price);
                    }}
                    className={`w-full py-3 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                      p.is_popular 
                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20' 
                        : 'bg-amber-500 hover:bg-amber-400 text-black font-black'
                    }`}
                  >
                    Assinar {p.name}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vantagens Icon Grid */}
        <div className="p-8 rounded-3xl bg-card border border-border/60 flex flex-col gap-6 text-center">
          <h3 className="font-bold text-foreground text-base">Vantagens de ser assinante</h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { title: 'Corte sempre', icon: <Scissors className="w-5 h-5 text-amber-400" /> },
              { title: 'Barbearias perto', icon: <MapPin className="w-5 h-5 text-amber-400" /> },
              { title: 'Escolha o barbeiro', icon: <Star className="w-5 h-5 text-amber-400" /> },
              { title: 'Acumule pontos', icon: <Coins className="w-5 h-5 text-amber-400" /> },
              { title: 'Descontos em produtos', icon: <Gift className="w-5 h-5 text-amber-400" /> },
              { title: 'Brindes especiais', icon: <Award className="w-5 h-5 text-amber-400" /> },
            ].map((v, i) => (
              <div key={i} className="p-4 rounded-2xl bg-secondary/30 border border-border/30 flex flex-col items-center gap-2 text-center">
                {v.icon}
                <span className="text-[10px] font-bold text-foreground">{v.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs Accordion */}
        <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full">
          <h3 className="font-bold text-foreground text-base text-center">Dúvidas Frequentes</h3>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="rounded-2xl border border-border/60 bg-card overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-foreground cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border/20 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-border/40 bg-card text-center text-xs text-muted-foreground select-none">
        <p className="text-[10px]">&copy; 2026 DOMUS BARBER CLUB. Todos os direitos reservados. Compra 100% segura.</p>
      </footer>
    </div>
  );
}
