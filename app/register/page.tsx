// app/register/page.tsx
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { authService } from '../../services/auth';
import { useToast } from '../../components/ui/Toast';
import { Input } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { ScissorsLineDashed, Mail, User, Phone, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const newErrors: Record<string, string> = {};

    if (!name) newErrors.name = 'O nome completo é obrigatório.';
    if (!email) {
      newErrors.email = 'O e-mail é obrigatório.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Insira um e-mail válido.';
    }
    if (!phone) newErrors.phone = 'O número de celular é obrigatório.';
    if (!password) newErrors.password = 'A senha é obrigatória.';
    else if (password.length < 6) newErrors.password = 'A senha deve ter pelo menos 6 caracteres.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.signUp(email, name, phone, password);
      if (res.success) {
        toast('Cadastro realizado com sucesso! Vamos criar sua barbearia agora.', 'success', 'Conta Criada');
        router.push('/onboarding');
      } else {
        setErrors({ email: res.error || 'Erro ao realizar cadastro.' });
        toast(res.error || 'Erro ao cadastrar conta', 'error', 'Erro');
      }
    } catch (err) {
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

      {/* Register Card */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="w-full max-w-md glass-card rounded-2xl border border-border/80 shadow-2xl p-8 relative z-10 flex flex-col gap-6"
      >
        {/* Branding header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl shadow-primary/20 border-2 border-primary/30">
            <img src="/logo.jpg" alt="DOMUS BARBER" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-extrabold tracking-wide uppercase mt-2">CRIAR CONTA</h1>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            Cadastre-se grátis para impulsionar a performance operacional da sua barbearia.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="text"
            label="Nome Completo"
            placeholder="Arthur Pendragon"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            icon={<User className="w-4 h-4 text-muted-foreground/60" />}
          />

          <Input
            type="email"
            label="Endereço de E-mail"
            placeholder="nome@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            icon={<Mail className="w-4 h-4 text-muted-foreground/60" />}
          />

          <Input
            type="tel"
            label="Celular / WhatsApp"
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
            icon={<Phone className="w-4 h-4 text-muted-foreground/60" />}
          />

          <Input
            type="password"
            label="Senha"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            icon={<ScissorsLineDashed className="w-4 h-4 text-muted-foreground/60" />}
          />

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full mt-2"
          >
            Registrar e Prosseguir
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>

        {/* Footer actions */}
        <div className="text-center text-xs mt-2">
          <span className="text-muted-foreground">
            Já tem uma conta cadastrada?{' '}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Entrar na Conta
            </Link>
          </span>
        </div>
      </motion.div>
    </div>
  );
}
