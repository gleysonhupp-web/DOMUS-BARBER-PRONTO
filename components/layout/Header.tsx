// components/layout/Header.tsx
"use client";

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { db } from '../../services/db';
import { authService } from '../../services/auth';
import { Avatar } from '../ui/Avatar';
import { Dropdown } from '../ui/Dropdown';
import { Badge } from '../ui/Badge';
import { 
  Bell, ChevronDown, LogOut, Settings, User, Building, 
  Check, MessageCircle, AlertTriangle, CalendarCheck, Sparkles, X 
} from 'lucide-react';
import { format } from 'date-fns';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'info' | 'warning' | 'success' | 'ai';
  read: boolean;
}

export const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  
  const user = db.getCurrentUser();
  const company = db.getCurrentCompany();

  // Find member role
  const members = db.getMembers();
  const currentMember = user ? members.find(m => m.user_id === user.id && m.company_id === company?.id) : null;
  const roleName = currentMember ? currentMember.role_id : 'guest';

  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n1',
      title: 'WhatsApp Conectado',
      description: 'A IA DOMUS AI está ativa e respondendo clientes automaticamente.',
      time: 'Há 10 min',
      type: 'ai',
      read: false
    },
    {
      id: 'n2',
      title: 'Alerta de Estoque',
      description: 'Shampoo Refresh Mentol atingiu a quantidade mínima em estoque.',
      time: 'Há 45 min',
      type: 'warning',
      read: false
    },
    {
      id: 'n3',
      title: 'Novo Agendamento',
      description: 'Rodrigo Oliveira agendou Corte + Barba para às 14:00.',
      time: 'Há 2 horas',
      type: 'success',
      read: false
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

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
      link: 'Meu Link de Agendamento',
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
    <header className="h-16 border-b border-border/40 bg-card/65 backdrop-blur-md flex items-center justify-between px-6 select-none relative z-30">
      {/* Route title details */}
      <div className="flex items-center gap-4">
        <h2 className="text-base font-bold text-foreground">{getPageTitle()}</h2>
      </div>

      {/* Action controls */}
      <div className="flex items-center gap-4.5">
        {/* Fixed Company Name Label (No switcher dropdown) */}
        {company && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/40 bg-secondary/30 text-xs font-semibold text-foreground">
            <Building className="w-3.5 h-3.5 text-primary" />
            <span>{company.name}</span>
          </div>
        )}

        {/* Notifications Button & Dropdown Popover */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-muted-foreground hover:text-foreground rounded-full border border-border/60 hover:bg-secondary/40 transition-colors cursor-pointer"
            title="Notificações"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            )}
          </button>

          {/* Notifications Popover Window */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-card border border-border/80 rounded-2xl shadow-2xl z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-border/40 flex items-center justify-between bg-secondary/30">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm text-foreground">Notificações</span>
                  {unreadCount > 0 && (
                    <Badge variant="primary" className="text-[10px] py-0 px-1.5">
                      {unreadCount} novas
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border/20">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Nenhuma notificação no momento.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-4 flex items-start gap-3 hover:bg-secondary/20 transition-colors cursor-pointer ${
                        !n.read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.type === 'ai' && <Sparkles className="w-4 h-4 text-amber-400" />}
                        {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                        {n.type === 'success' && <CalendarCheck className="w-4 h-4 text-green-400" />}
                        {n.type === 'info' && <MessageCircle className="w-4 h-4 text-blue-400" />}
                      </div>
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-bold ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {n.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">{n.time}</span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed text-[11px]">
                          {n.description}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 text-center border-t border-border/40 bg-secondary/10">
                <span className="text-[10px] text-muted-foreground">DOMUS BARBER — Central de Notificações</span>
              </div>
            </div>
          )}
        </div>

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
