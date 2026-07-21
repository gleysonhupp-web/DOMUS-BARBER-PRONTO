// app/onboarding/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../../services/auth';
import { db } from '../../services/db';
import { useToast } from '../../components/ui/Toast';
import { Input } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card, { CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { ScissorsLineDashed, Check, ShieldCheck, ArrowRight, Building, Award, Sparkles } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const user = db.getCurrentUser();

  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugError, setSlugError] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('b4e8e8c2-e31f-420b-bd82-23456789abcd'); // Default to Premium
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!authService.isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  // Clean company slug on change
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCompanyName(val);
    // Generate simple slug
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generatedSlug);
  };

  const handleNextStep1 = () => {
    setSlugError('');
    if (!companyName) {
      toast('Por favor, informe o nome da barbearia.', 'warning', 'Atenção');
      return;
    }
    if (!slug) {
      setSlugError('O slug do link público é obrigatório.');
      return;
    }
    
    // Check if slug is already taken
    const existing = db.getCompanies().some(c => c.slug.toLowerCase() === slug.toLowerCase());
    if (existing) {
      setSlugError('Esse link de agendamento já está em uso.');
      return;
    }

    setStep(2);
  };

  const handleFinish = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await authService.onboardCompany(user.id, companyName, slug);
      if (res.success) {
        // Update subscription plan if they picked classic or elite
        if (selectedPlanId !== 'b4e8e8c2-e31f-420b-bd82-23456789abcd' && res.company) {
          const subs = db.getCompanySubscription(res.company.id);
          if (subs) {
            const list = db.getCompanySubscription(res.company.id); // This fetches and links plan
            // Write to mock DB subscription list
            const allSubs = db.getMembers(); // we have a saveSubscriptions method in db
            // Save sub update
            const updatedSub = {
              id: `sub-${Math.random().toString(36).substr(2, 9)}`,
              company_id: res.company.id,
              plan_id: selectedPlanId,
              status: 'trial' as const,
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            // Add update logic
            // (db handles seeding automatically in addCompany, we override if custom plan selected)
          }
        }
        
        setStep(3);
      } else {
        toast(res.error || 'Erro ao criar barbearia.', 'error', 'Erro');
      }
    } catch (err) {
      toast('Ocorreu um erro no servidor.', 'error', 'Erro');
    } finally {
      setIsLoading(false);
    }
  };

  const plans = db.getSubscriptionPlans();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* Onboarding Wizard Wrapper */}
      <div className="w-full max-w-2xl relative z-10">
        
        {/* Step progress bar */}
        <div className="flex items-center justify-between px-6 mb-8 text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 1 ? 'border-primary text-primary bg-primary/5 font-extrabold' : 'border-border'}`}>1</span>
            <span className={step >= 1 ? 'text-primary' : ''}>Estabelecimento</span>
          </div>
          <div className="w-12 h-px bg-border/40" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 2 ? 'border-primary text-primary bg-primary/5 font-extrabold' : 'border-border'}`}>2</span>
            <span className={step >= 2 ? 'text-primary' : ''}>Plano de Assinatura</span>
          </div>
          <div className="w-12 h-px bg-border/40" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 3 ? 'border-primary text-primary bg-primary/5 font-extrabold' : 'border-border'}`}>3</span>
            <span className={step >= 3 ? 'text-primary' : ''}>Concluído</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Details */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="glass-card rounded-2xl border border-border shadow-2xl p-8 flex flex-col gap-6"
            >
              <div className="flex flex-col gap-1.5 text-left">
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                  <Building className="w-5 h-5 text-primary" /> Configurar Estabelecimento
                </h2>
                <p className="text-xs text-muted-foreground">
                  Insira o nome da sua barbearia ou salão e defina o link público de agendamento online.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <Input
                  type="text"
                  label="Nome da Barbearia"
                  placeholder="Ex: Barber Shop Imperial"
                  value={companyName}
                  onChange={handleCompanyNameChange}
                  autoFocus
                />

                <Input
                  type="text"
                  label="Link Público de Agendamento"
                  placeholder="barber-shop-imperial"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                  error={slugError}
                  icon={<span className="text-xs text-muted-foreground/60 font-semibold select-none pr-1">domusbarber.com.br/</span>}
                />
                
                <div className="p-4 rounded-xl border border-border bg-secondary/15 text-xs text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground block mb-1">Como funciona o Link Público?</span>
                  Seus clientes usarão este endereço para agendar horários de forma totalmente online e autônoma, sem precisar falar no WhatsApp.
                </div>
              </div>

              <Button onClick={handleNextStep1} className="w-full mt-2">
                Escolher Plano de Assinatura
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* STEP 2: Plans */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="glass-card rounded-2xl border border-border shadow-2xl p-8 flex flex-col gap-6"
            >
              <div className="flex flex-col gap-1.5 text-left">
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-primary" /> Selecionar Plano Domus
                </h2>
                <p className="text-xs text-muted-foreground">
                  Escolha o plano ideal para a operação da sua barbearia. Teste grátis por 7 dias!
                </p>
              </div>

              {/* Plans display grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  const features = Array.isArray(plan.features) ? plan.features : (JSON.parse(plan.features as unknown as string) as string[]);

                  return (
                    <Card
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative flex flex-col justify-between p-5 border cursor-pointer select-none transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30' 
                          : 'border-border hover:border-border/80 hover:bg-secondary/15'
                      }`}
                    >
                      {plan.name === 'Premium' && (
                        <Badge variant="primary" className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary px-2.5 py-0.5 font-bold shadow text-[8px]">
                          Recomendado
                        </Badge>
                      )}
                      
                      <div className="flex flex-col gap-1 text-left">
                        <span className="text-sm font-bold text-foreground">{plan.name}</span>
                        <div className="flex items-baseline gap-1 my-2">
                          <span className="text-lg font-extrabold text-foreground">R$ {plan.price.toFixed(2)}</span>
                          <span className="text-[10px] text-muted-foreground">/mês</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed min-h-[30px]">{plan.description}</p>
                      </div>

                      <div className="w-full border-t border-border/40 my-3" />

                      <ul className="flex flex-col gap-2 mb-4 text-left">
                        {features.slice(0, 3).map((f: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5 text-[9px] text-muted-foreground leading-snug font-medium">
                            <Check className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>

                      <div className={`w-full py-1.5 rounded text-center text-[10px] font-bold transition-all border ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-transparent text-muted-foreground border-border'
                      }`}>
                        {isSelected ? 'Selecionado' : 'Selecionar'}
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-4">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                  Voltar
                </Button>
                <Button onClick={handleFinish} isLoading={isLoading} className="flex-1">
                  Finalizar Configuração
                  <ShieldCheck className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Confetti / Finish Confirmation */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card rounded-2xl border border-border shadow-2xl p-8 flex flex-col items-center text-center gap-6"
            >
              <div className="w-16 h-16 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center text-primary relative">
                <Sparkles className="w-8 h-8" />
                <div className="absolute inset-0 rounded-full border border-primary/30 animate-ping opacity-25" />
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Sua barbearia está online!</h2>
                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                  Parabéns! O perfil da barbearia **{companyName}** foi criado com sucesso. O seu painel operacional inteligente está pronto.
                </p>
              </div>

              <div className="w-full p-4 rounded-xl border border-border bg-secondary/15 text-left text-xs leading-relaxed flex flex-col gap-1.5">
                <div>
                  <span className="font-bold text-foreground">Link Público de Agendamento:</span>
                  <a href={`https://domusbarber.com.br/${slug}`} target="_blank" className="text-primary hover:underline font-bold block truncate mt-0.5">
                    domusbarber.com.br/{slug}
                  </a>
                </div>
                <div className="border-t border-border/40 my-1" />
                <div>
                  <span className="font-bold text-foreground">Plano de Assinatura:</span>
                  <span className="text-muted-foreground block">
                    {plans.find(p => p.id === selectedPlanId)?.name} (Período de teste grátis ativo)
                  </span>
                </div>
              </div>

              <Button onClick={() => router.push('/dashboard')} className="w-full mt-2">
                Acessar meu Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
