// components/layout/BottomNav.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard, Calendar, Users, DollarSign, Menu, X,
  Scissors, UserCheck, Package, Target, Link as LinkIcon,
  MessageSquareCode, Brain, Settings, LogOut, ChevronRight, Building, Crown
} from 'lucide-react';

import { db } from '../../services/db';
import { authService } from '../../services/auth';

export const BottomNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const company = db.getCurrentCompany();
  const currentUser = db.getCurrentUser();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const isCollaborator = db.checkIsCollaborator(currentUser, company?.id || 'c1111111-1111-1111-1111-111111111111');

  // Don't show bottom navigation on auth pages
  const hidePaths = ['/login', '/register', '/onboarding', '/forgot-password'];
  if (hidePaths.some(p => pathname?.startsWith(p))) {
    return null;
  }

  const handleLogout = async () => {
    setIsMoreMenuOpen(false);
    await authService.signOut();
    router.push('/login');
  };

  const primaryMobileLinks = isCollaborator ? [
    { name: 'Agenda', href: '/agenda', icon: Calendar },
    { name: 'Metas', href: '/metas', icon: Target },
  ] : [
    { name: 'Painel', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Agenda', href: '/agenda', icon: Calendar },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Finanças', href: '/financeiro', icon: DollarSign },
  ];

  const allModules = [
    { name: 'Visão Geral', href: '/dashboard', icon: LayoutDashboard, category: 'Gestão' },
    { name: 'Agenda de Serviços', href: '/agenda', icon: Calendar, category: 'Operacional' },
    { name: 'Gestão de Clientes', href: '/clientes', icon: Users, category: 'Operacional' },
    { name: 'Assinaturas Clube', href: '/assinaturas', icon: Crown, category: 'Clube VIP', highlight: true },
    { name: 'Catálogo de Serviços', href: '/servicos', icon: Scissors, category: 'Cadastros' },
    { name: 'Equipe Profissional', href: '/profissionais', icon: UserCheck, category: 'Cadastros' },
    { name: 'Fluxo Financeiro', href: '/financeiro', icon: DollarSign, category: 'Gestão' },
    { name: 'Controle de Estoque', href: '/estoque', icon: Package, category: 'Gestão' },
    { name: 'Metas & Desempenho', href: '/metas', icon: Target, category: 'Equipe' },
    { name: 'Link de Agendamento', href: '/link', icon: LinkIcon, category: 'Canais' },
    { name: 'Conexão WhatsApp', href: '/whatsapp', icon: MessageSquareCode, category: 'Canais' },
    { name: 'Inteligência DOMUS AI', href: '/ia', icon: Brain, category: 'Canais' },
    { name: 'Ajustes do Workspace', href: '/configuracoes', icon: Settings, category: 'Sistema' },
  ];

  return (
    <>
      {/* Fixed Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#12151C]/95 backdrop-blur-xl border-t border-amber-500/20 flex items-center justify-around px-2 pb-safe z-40 select-none shadow-2xl">
        {primaryMobileLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMoreMenuOpen(false)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-1.5 transition-all cursor-pointer",
                isActive ? "text-amber-400 font-extrabold" : "text-gray-400 hover:text-white"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-amber-400 stroke-[2.5px] scale-110" : "text-gray-400")} />
              <span className="text-[10px] tracking-wider font-bold">{link.name}</span>
            </Link>
          );
        })}

        {/* More Menu Button / Exit for Collaborator */}
        {!isCollaborator ? (
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 py-1.5 transition-all cursor-pointer",
              isMoreMenuOpen ? "text-amber-400 font-extrabold" : "text-gray-400 hover:text-white"
            )}
          >
            {isMoreMenuOpen ? (
              <X className="w-5 h-5 text-amber-400 stroke-[2.5px]" />
            ) : (
              <Menu className="w-5 h-5 text-gray-400" />
            )}
            <span className="text-[10px] tracking-wider font-bold">
              {isMoreMenuOpen ? 'Fechar' : 'Mais ☰'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 text-red-400 hover:text-red-300 transition-all cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-red-400" />
            <span className="text-[10px] tracking-wider font-bold">Sair</span>
          </button>
        )}
      </nav>

      {/* Full Mobile Menu Sheet (Slide Up) */}
      {isMoreMenuOpen && !isCollaborator && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-[#1A1D24] border-t-2 border-amber-500/40 rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto flex flex-col gap-5 shadow-2xl">
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">{company?.name || 'DOMUS BARBER'}</h3>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">MENU DO GESTOR</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {allModules.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMoreMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer text-left relative overflow-hidden",
                      isActive
                        ? "bg-gradient-to-r from-amber-500/25 to-amber-600/15 border-amber-500 text-white font-extrabold shadow-lg"
                        : item.highlight
                        ? "bg-gradient-to-r from-amber-500/10 via-[#242730] to-[#242730] border-amber-500/40 text-amber-300 font-bold"
                        : "bg-[#242730] border-gray-800 text-gray-300 hover:border-amber-500/30 hover:text-white"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                      isActive ? "bg-amber-500 text-black font-bold" : item.highlight ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-black/30 text-amber-400"
                    )}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold block truncate">{item.name}</span>
                      <span className="text-[9px] text-gray-400 block">{item.category}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Exit button */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-3.5 px-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all cursor-pointer mt-2"
            >
              <LogOut className="w-4 h-4" /> Sair do Sistema
            </button>
          </div>
        </div>
      )}
    </>
  );
};
export default BottomNav;
