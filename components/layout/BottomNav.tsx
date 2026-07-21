// components/layout/BottomNav.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../lib/utils';
import { LayoutDashboard, Calendar, Users, DollarSign, MessageSquareCode } from 'lucide-react';

export const BottomNav = () => {
  const pathname = usePathname();

  const mobileLinks = [
    { name: 'Painel', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Agenda', href: '/agenda', icon: Calendar },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Finanças', href: '/financeiro', icon: DollarSign },
    { name: 'Whats', href: '/whatsapp', icon: MessageSquareCode },
  ];

  // Don't show bottom navigation on login/register/onboarding
  const hidePaths = ['/login', '/register', '/onboarding', '/forgot-password'];
  if (hidePaths.some(p => pathname?.startsWith(p))) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/90 backdrop-blur-md border-t border-border/40 flex items-center justify-around px-2 pb-safe z-30 select-none shadow-2xl">
      {mobileLinks.map((link) => {
        const isActive = pathname === link.href;
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 py-1.5 transition-colors cursor-pointer",
              isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("w-5 h-5", isActive ? "text-primary stroke-[2.5px]" : "text-muted-foreground")} />
            <span className="text-[10px] tracking-wider font-semibold">{link.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};
export default BottomNav;
