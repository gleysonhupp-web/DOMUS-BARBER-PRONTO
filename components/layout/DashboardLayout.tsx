// components/layout/DashboardLayout.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import { authService } from '../../services/auth';
import { db } from '../../services/db';
import { Loader2, Lock, AlertTriangle, MessageSquare } from 'lucide-react';
import Button from '../ui/Button';

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !authService.isAuthenticated();
    }
    return false;
  });
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const isLoggedIn = authService.isAuthenticated();
      if (!isLoggedIn) {
        router.push('/login');
        setLoading(false);
        return;
      }

      const company = db.getCurrentCompany();
      const needsOnboarding = !company && pathname !== '/onboarding';
      
      if (needsOnboarding) {
        router.push('/onboarding');
        return;
      }

      if (company) {
        // Check subscription logic
        const subs = db.getSubscriptions(company.id);
        if (subs && subs.length > 0) {
          const sub = subs[0]; // Active/trial subscription
          const now = new Date().getTime();
          const end = new Date(sub.current_period_end).getTime();

          let currentStatus = sub.status;

          // Auto-block logic: trial expired
          if (currentStatus === 'trial' && now > end) {
            currentStatus = 'past_due';
            
            // Update in DB
            subs[0].status = 'past_due';
            const allSubs = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('domus_subscriptions') || '[]') : [];
            const newSubs = allSubs.map((s: any) => s.id === sub.id ? subs[0] : s);
            if (typeof window !== 'undefined') localStorage.setItem('domus_subscriptions', JSON.stringify(newSubs));
          }

          if (currentStatus === 'past_due' || currentStatus === 'unpaid' || currentStatus === 'canceled') {
            setIsBlocked(true);
          }
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-primary">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm font-semibold tracking-wider text-muted-foreground mt-3 uppercase">Carregando Domus...</span>
      </div>
    );
  }

  // Se a barbearia estiver bloqueada, renderiza uma tela de bloqueio impenetrável
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <Lock className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-foreground mb-4">Acesso Bloqueado</h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8 leading-relaxed">
          O seu período de testes expirou ou a assinatura está pendente. Para continuar utilizando todas as ferramentas do DOMUS BARBER, por favor, entre em contato com o administrador.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={() => window.location.href = 'https://wa.me/5511999999999'} className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Contatar Suporte
          </Button>
          <Button variant="outline" onClick={() => { authService.signOut(); router.push('/login'); }}>
            Sair da Conta
          </Button>
        </div>

        <div className="mt-12 bg-secondary/30 border border-border/40 rounded-xl p-4 flex items-start gap-3 max-w-md text-left">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Aviso:</strong> Seus dados de agendamentos, estoque e clientes estão salvos em segurança. O sistema apenas bloqueou novas edições até a regularização.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main wrapper content panels */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8 relative">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile touch nav */}
      <BottomNav />
    </div>
  );
};
export default DashboardLayout;
