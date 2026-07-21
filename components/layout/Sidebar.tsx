// components/layout/Sidebar.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { 
  LayoutDashboard, Calendar, Users, Scissors, UserCheck, 
  DollarSign, Package, MessageSquareCode, Brain, Settings, 
  ChevronLeft, ChevronRight, LogOut, ScissorsLineDashed, Link2
} from 'lucide-react';
import { authService } from '../../services/auth';
import { db } from '../../services/db';
import { useRouter } from 'next/navigation';

export interface SidebarProps {
  className?: string;
}

export const Sidebar = ({ className }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const company = db.getCurrentCompany();

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Agenda', href: '/agenda', icon: Calendar },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Serviços', href: '/servicos', icon: Scissors },
    { name: 'Profissionais', href: '/profissionais', icon: UserCheck },
    { name: 'Financeiro', href: '/financeiro', icon: DollarSign },
    { name: 'Estoque', href: '/estoque', icon: Package },
    { name: 'Meu Link', href: '/link', icon: Link2 },
    { name: 'WhatsApp', href: '/whatsapp', icon: MessageSquareCode },
    { name: 'Auto-Atendimento', href: '/ia', icon: Brain },
    { name: 'Configurações', href: '/configuracoes', icon: Settings },
  ];

  const handleLogout = async () => {
    await authService.signOut();
    router.push('/login');
  };

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "hidden md:flex flex-col h-screen bg-card border-r border-border/40 text-card-foreground select-none relative z-20 shrink-0",
        className
      )}
    >
      {/* Brand logo header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border/40">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-primary/30 shadow-md shadow-primary/10 bg-black flex items-center justify-center">
            <img src="/logo.jpg" alt="DOMUS BARBER CLUB" className="w-full h-full object-cover" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold tracking-wider text-xs text-primary leading-tight">
                DOMUS BARBER
              </span>
              <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
                BARBER CLUB
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full border border-border bg-card hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer z-30"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Barbershop profile display */}
      {!isCollapsed && company && (
        <div className="p-4 mx-4 mt-4 mb-2 rounded-xl bg-secondary/40 border border-border/40 flex flex-col gap-0.5">
          <span className="text-[10px] font-bold text-primary tracking-wider uppercase">Estabelecimento</span>
          <span className="text-sm font-bold text-foreground truncate">{company.name}</span>
          <span className="text-[10px] text-muted-foreground truncate">domusbarber.com.br/{company.slug}</span>
        </div>
      )}

      {/* Menu links list */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm transition-all relative group cursor-pointer font-medium",
                isActive 
                  ? "text-primary-foreground font-semibold" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeMenuItem"
                  className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              
              <Icon className={cn("w-4.5 h-4.5 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary transition-colors")} />
              
              {!isCollapsed && (
                <span className="truncate">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="p-3 border-t border-border/40">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all cursor-pointer font-semibold"
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          {!isCollapsed && <span>Sair da Conta</span>}
        </button>
      </div>
    </motion.aside>
  );
};
export default Sidebar;
