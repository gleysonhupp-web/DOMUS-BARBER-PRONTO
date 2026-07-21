// app/forgot-password/page.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useToast } from '../../components/ui/Toast';
import { Input } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { ScissorsLineDashed, Mail, ArrowLeft, Send } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('O e-mail é obrigatório.');
      return;
    }

    setIsLoading(true);
    // Simulate recovery email send
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsLoading(false);
    setIsSent(true);
    toast('Instruções enviadas para o seu e-mail.', 'success', 'Recuperação Enviada');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="w-full max-w-md glass-card rounded-2xl border border-border/80 shadow-2xl p-8 relative z-10 flex flex-col gap-6"
      >
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20">
            <ScissorsLineDashed className="w-6 h-6 stroke-[2.5px]" />
          </div>
          <h1 className="text-xl font-extrabold tracking-wide uppercase mt-2">RECUPERAR SENHA</h1>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            Insera seu e-mail cadastrado e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        {isSent ? (
          <div className="flex flex-col gap-4 text-center">
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-400 leading-relaxed font-semibold">
              E-mail enviado! Verifique sua caixa de entrada e siga as instruções para cadastrar uma nova senha.
            </div>
            <Link href="/login" className="w-full flex items-center justify-center gap-2 text-xs font-bold text-primary hover:underline mt-2">
              <ArrowLeft className="w-4 h-4" /> Voltar para o Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="email"
              label="E-mail de Cadastro"
              placeholder="nome@barbearia.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
              icon={<Mail className="w-4 h-4 text-muted-foreground/60" />}
            />

            <Button type="submit" isLoading={isLoading} className="w-full mt-2">
              Enviar Link de Redefinição
              <Send className="w-4 h-4 ml-2" />
            </Button>
            
            <Link href="/login" className="w-full flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:underline mt-2">
              <ArrowLeft className="w-4 h-4" /> Voltar para o Login
            </Link>
          </form>
        )}
      </motion.div>
    </div>
  );
}
