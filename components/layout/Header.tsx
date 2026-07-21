// components/layout/Header.tsx
"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { db } from '../../services/db';
import { authService } from '../../services/auth';
import { Avatar } from '../ui/Avatar';
import { Dropdown } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { Bell, ChevronDown, LogOut, Settings, User, BarChart3, Building } from 'lucide-react';

export const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  
  const user = db.getCurrentUser();
  const company = db.getCurrentCompany();
  const companies = db.getCompanies();

  // Find member role
  const members = db.getMembers();
  const currentMember = user ? members.find(m => m.user_id === user.id && m.company_id === company?.id) : null;
  const roleName = currentMember ? currentMember.role_id : 'guest';

  // Translate roles to Portuguese display names
  const roleLabels: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Gerente',
    professional: 'Barbeiro',
    receptionist: 'Atendimento'
  };

  // Human readable breadcrumb title
  const getPageTitle = () => {
    const segments = pathname!.split('/').filter(Boolean);
    if (segments.length === 0) return 'Painel';
    const mainRoute = segments[0];
    
    const titles: Record<string, string> = {
      dashboard: 'Visão Geral',
      agenda: 'Agenda de Serviços',
      clientes: 'Gestão de Clientes',
      servicos: 'Catálogo de Serviços',
      profissionais: 'Equipe de Profissionais',
      financeiro: 'Fluxo Financeiro',
      estoque: 'Controle de Estoque',
      whatsapp: 'Conexão WhatsApp',
      ia: 'Configurações de IA',
      configuracoes: 'Ajustes do Workspace'
    };

    return titles[mainRoute] || mainRoute.charAt(0).toUpperCase() + mainRoute.slice(1);
  };

  const handleLogout = async () => {
    await authService.signOut();
    router.push('/login');
  };

  const switchCompany = (companyId: string) => {
    const comp = companies.find(c => c.id === companyId);
    if (comp) {
      db.setCurrentCompany(comp);
      window.location.reload(); // Refresh to reload data context
    }
  };

  const companyDropdownItems = companies.map(c => ({
    label: c.name,
    onClick: () => switchCompany(c.id),
    icon: <Building className="w-4 h-4 text-primary" />,
    disabled: c.id === company?.id
  }));

  const userDropdownItems = [
    {
      label: 'Meu Perfil',
      onClick: () => router.push('/configuracoes'),
      icon: <User className="w-4 h-4" />
    },
    {
      label: 'Configurações',
      onClick: () => router.push('/configuracoes'),
      icon: <Settings className="w-4 h-4" />
    },
    {
      label: 'Sair da Conta',
      onClick: handleLogout,
      icon: <LogOut className="w-4 h-4 text-red-400" />,
      className: 'text-red-400 hover:bg-red-500/5'
    }
  ];

  return (
    <header className="h-16 border-b border-border/40 bg-card/65 backdrop-blur-md flex items-center justify-between px-6 select-none relative z-10">
      {/* Route title details */}
      <div className="flex items-center gap-4">
        <h2 className="text-base font-bold text-foreground">{getPageTitle()}</h2>
      </div>

      {/* Action controls */}
      <div className="flex items-center gap-4.5">
        {/* Workspace select dropdown */}
        {company && companies.length > 1 && (
          <Dropdown
            align="right"
            trigger={
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary/35 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all cursor-pointer">
                <span>{company.name}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            }
            items={companyDropdownItems}
          />
        )}

        {/* Notifications badge mockup */}
        <button className="relative p-2 text-muted-foreground hover:text-foreground rounded-full border border-border/60 hover:bg-secondary/40 transition-colors cursor-pointer">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
        </button>

        {/* Vertical divider */}
        <div className="w-px h-6 bg-border/80" />

        {/* Profile menu dropdown */}
        {user && (
          <Dropdown
            align="right"
            trigger={
              <button className="flex items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer">
                <Avatar src={user.avatar_url} name={user.full_name} size="sm" />
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-foreground leading-none mb-1">{user.full_name}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="primary" className="text-[8px] py-0 px-1 font-bold h-3.5 uppercase tracking-wide">
                      {roleLabels[roleName] || roleName}
                    </Badge>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            }
            items={userDropdownItems}
          />
        )}
      </div>
    </header>
  );
};
export default Header;
