// app/admin/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldAlert, Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';

// ── Super Admin credentials (hardcoded for mock SaaS mode) ──────────────
const ADMIN_EMAIL = 'admin@domusbarber.com.br';
const ADMIN_PASSWORD = '123456';
const ADMIN_SESSION_KEY = 'domus_super_admin_session';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    setIsLoading(true);

    if (
      email.toLowerCase().trim() === ADMIN_EMAIL &&
      password === ADMIN_PASSWORD
    ) {
      // Save admin session
      if (typeof window !== 'undefined') {
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ 
          email: ADMIN_EMAIL, 
          loggedAt: new Date().toISOString() 
        }));
      }
      router.push('/admin');
    } else {
      setError('Credenciais inválidas. Acesso negado.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-red-900/10 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="w-full max-w-md bg-card border border-border/80 shadow-2xl rounded-2xl p-8 flex flex-col gap-6 relative z-10"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-lg">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider uppercase text-foreground">Área Restrita</h1>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Acesso exclusivo para administradores do SaaS.<br/>
              Somente pessoal autorizado.
            </p>
          </div>
          <div className="w-full border-t border-border/40 mt-1" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">E-mail Admin</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@domusbarber.com.br"
                autoFocus
                className="w-full pl-9 pr-4 py-3 text-sm bg-secondary/40 border border-border/60 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 text-foreground placeholder-muted-foreground/40 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Senha de Acesso</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-3 text-sm bg-secondary/40 border border-border/60 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 text-foreground placeholder-muted-foreground/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-500 font-semibold bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2"
            >
              {error}
            </motion.p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>Acessar Painel <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <p className="text-center text-[10px] text-muted-foreground/40 select-none">
          DOMUS BARBER © {new Date().getFullYear()} — Acesso monitorado e restrito
        </p>
      </motion.div>
    </div>
  );
}
