// app/page.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ScissorsLineDashed, Calendar, MessageSquareCode, Brain, 
  Users, DollarSign, Package, Check, ShieldCheck, Sparkles 
} from 'lucide-react';
import { db } from './../services/db';

export default function LandingPage() {
  const plans = db.getSubscriptionPlans();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Decorative premium glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-0 w-[400px] h-[400px] rounded-full bg-bronze-900/5 blur-[120px] pointer-events-none" />

      {/* Header Portal Nav */}
      <header className="h-20 border-b border-border/40 bg-card/45 backdrop-blur-md flex items-center justify-between px-6 md:px-12 relative z-10 select-none">
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
          <Link href="/login" className="text-xs font-bold text-muted-foreground hover:text-foreground hover:underline transition-colors">
            Acessar Conta
          </Link>
          <Link href="/register" className="px-4 py-2 bg-primary text-primary-foreground hover:bg-bronze-500 rounded-lg text-xs font-bold shadow shadow-primary/10 transition-all">
            Criar Conta Grátis
          </Link>
        </div>
      </header>

      {/* Hero Content Section */}
      <section className="flex-1 max-w-5xl mx-auto w-full px-6 py-16 md:py-24 text-center flex flex-col items-center gap-6 relative z-10">
        
        {/* Spark indicator tag */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-primary/20 bg-primary/5 rounded-full text-[10px] font-bold text-primary uppercase tracking-wider select-none"
        >
          <Sparkles className="w-3.5 h-3.5" /> A Era da Barbearia Inteligente
        </motion.div>

        {/* Hero headline text */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl md:text-6xl font-black tracking-tight leading-none text-foreground max-w-3xl"
        >
          A plataforma operacional inteligente para barbearias de{' '}
          <span className="bg-gradient-to-r from-primary via-bronze-300 to-primary bg-clip-text text-transparent">
            alta performance.
          </span>
        </motion.h1>

        {/* Hero description subtext */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-sm md:text-base text-muted-foreground max-w-xl leading-relaxed mt-2"
        >
          Centralize sua agenda online, CRM de clientes, faturamento, comissões de profissionais e atendimento inteligente integrado ao WhatsApp em um único ecossistema premium.
        </motion.p>

        {/* Hero CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 mt-6 w-full sm:w-auto"
        >
          <Link href="/register" className="px-7 py-3.5 bg-primary text-primary-foreground hover:bg-bronze-500 rounded-xl text-sm font-extrabold shadow-lg shadow-primary/10 text-center transition-all hover:scale-[1.01] active:scale-[0.99]">
            Experimentar 7 Dias Grátis
          </Link>
          <Link href="/login" className="px-7 py-3.5 bg-secondary text-foreground hover:bg-secondary/70 rounded-xl text-sm font-extrabold border border-border/80 text-center transition-all hover:scale-[1.01] active:scale-[0.99]">
            Acessar Área Administrativa
          </Link>
        </motion.div>
      </section>

      {/* Feature showcase grids */}
      <section className="bg-secondary/20 border-t border-border/40 py-16 md:py-24 relative z-10">
        <div className="max-w-5xl mx-auto w-full px-6">
          <div className="text-center flex flex-col items-center gap-1.5 mb-12">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Recursos Premium</span>
            <h2 className="text-2xl md:text-3xl font-black text-foreground">Equipado com tudo o que você precisa</h2>
            <p className="text-xs text-muted-foreground max-w-md mt-1">Esqueça planilhas e agendas de papel. Administre seu salão como um executivo de alta performance.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="p-6 rounded-xl border border-border/40 bg-card/60 flex flex-col gap-3 text-left">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Agenda Online & Link Público</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Seus clientes agendam de forma online 24h por dia pelo link da sua barbearia. Sincronização em tempo real para evitar conflitos de horários.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl border border-border/40 bg-card/60 flex flex-col gap-3 text-left">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
                <MessageSquareCode className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">IA Integrada ao WhatsApp</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Um atendente virtual inteligente que responde clientes no WhatsApp, tira dúvidas de preços e envia o link de agendamento automático.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl border border-border/40 bg-card/60 flex flex-col gap-3 text-left">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Financeiro & Comissões</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Controle de entradas e saídas de caixa, comissões de barbeiros calculadas na hora e relatórios para simplificar sua contabilidade.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Subscription Plans showcase */}
      <section className="py-16 md:py-24 relative z-10">
        <div className="max-w-5xl mx-auto w-full px-6">
          <div className="text-center flex flex-col items-center gap-1.5 mb-12">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Tabela de Preços</span>
            <h2 className="text-2xl md:text-3xl font-black text-foreground">Planos flexíveis para cada momento</h2>
            <p className="text-xs text-muted-foreground max-w-md mt-1">Crie sua conta grátis, selecione um plano e comece a usar sem fidelidades.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 max-w-sm mx-auto">
            {plans.map((plan) => {
              const features = Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features as any);

              return (
                <div 
                  key={plan.id}
                  className={`p-6 rounded-xl border flex flex-col justify-between text-left relative bg-card ${
                    plan.name === 'Premium' 
                      ? 'border-primary shadow-xl shadow-primary/5 bg-primary/[0.02]' 
                      : 'border-border/60'
                  }`}
                >
                  {plan.name === 'Premium' && (
                    <span className="absolute -top-2.5 left-6 bg-primary text-primary-foreground text-[8px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow">
                      Mais Popular
                    </span>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 my-3">
                      <span className="text-2xl font-black text-foreground">R$ {plan.price.toFixed(2)}</span>
                      <span className="text-[10px] text-muted-foreground">/mês</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mb-4 min-h-[30px]">{plan.description}</p>
                    
                    <div className="w-full border-t border-border/40 my-4" />

                    <ul className="flex flex-col gap-2.5 mb-6">
                      {features.map((f: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-[10px] text-muted-foreground leading-relaxed font-medium">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link href="/login" className={`w-full py-2.5 rounded-lg text-xs font-bold text-center transition-all bg-primary text-primary-foreground hover:bg-bronze-500 shadow shadow-primary/10`}>
                    Acessar Minha Conta
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Landing Footer */}
      <footer className="py-8 border-t border-border/40 bg-card text-center text-xs text-muted-foreground relative z-10 select-none">
        <div className="flex items-center justify-center gap-1.5 mb-2 font-semibold">
          <ScissorsLineDashed className="w-3.5 h-3.5 text-primary" />
          <span>DOMUS BARBER</span>
        </div>
        <p className="text-[10px]">&copy; 2026 Domus Barber Tech. Todos os direitos reservados. Feito com tecnologia de alto impacto.</p>
      </footer>
    </div>
  );
}
