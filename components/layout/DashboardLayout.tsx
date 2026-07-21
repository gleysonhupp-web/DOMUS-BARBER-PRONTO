// components/layout/DashboardLayout.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import { authService } from '../../services/auth';
import { db } from '../../services/db';
import { Loader2 } from 'lucide-react';

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Small artificial loading buffer to prevent screen flickers
      await new Promise(resolve => setTimeout(resolve, 100));

      const isLoggedIn = authService.isAuthenticated();
      if (!isLoggedIn) {
        router.push('/login');
        return;
      }

      const company = db.getCurrentCompany();
      const needsOnboarding = !company && pathname !== '/onboarding';
      
      if (needsOnboarding) {
        router.push('/onboarding');
        return;
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
