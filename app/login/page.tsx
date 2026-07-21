// app/login/page.tsx
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { authService } from '../../services/auth';
import { useToast } from '../../components/ui/Toast';
import { Input } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { ScissorsLineDashed, Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('O e-mail é obrigatório.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Insira um endereço de e-mail válido.');
      return;
    }

    if (!password) {
      setError('A senha é obrigatória.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.signIn(email, password);
      if (res.success) {
        toast('Bem-vindo de volta ao Domus Barber!', 'success', 'Login bem-sucedido');
        if (res.company) {
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
      } else {
        setError(res.error || 'E-mail ou senha incorretos. Tente novamente.');
        toast(res.error || 'Erro ao realizar login', 'error', 'Erro');
      }
    } catch (err: any) {
      setError('Ocorreu um erro inesperado.');
      toast('Não foi possível conectar ao servidor.', 'error', 'Erro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Visual background lights */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-bronze-800/5 blur-[130px] pointer-events-none" />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="w-full max-w-md glass-card rounded-2xl border border-border/80 shadow-2xl p-8 relative z-10 flex flex-col gap-6"
      >
        {/* Branding header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20">
            <ScissorsLineDashed className="w-7 h-7 stroke-[2.5px]" />
          </div>
          <h1 className="text-xl font-extrabold tracking-wide uppercase mt-2">DOMUS BARBER</h1>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            Entre com sua conta para acessar o painel da sua barbearia.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="email"
            label="E-mail"
            placeholder="nome@barbearia.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-4 h-4 text-muted-foreground/60" />}
            autoFocus
          />

          <Input
            type="password"
            label="Senha"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
            icon={<Lock className="w-4 h-4 text-muted-foreground/60" />}
          />

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full mt-2"
          >
            Entrar na Minha Conta
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>

        {/* Footer actions */}
        <div className="text-center text-xs flex flex-col gap-2 mt-2">
          <span className="text-muted-foreground">
            Ainda não tem conta?{' '}
            <Link href="/register" className="text-primary font-bold hover:underline">
              Criar Conta Nova
            </Link>
          </span>
          <Link href="/forgot-password" className="text-muted-foreground/65 hover:text-foreground hover:underline font-semibold mt-1">
            Esqueceu sua senha?
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
