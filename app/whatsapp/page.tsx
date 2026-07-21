// app/whatsapp/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/DashboardWidgets';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Switch from '../../components/ui/Switch';
import Badge from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { db } from '../../services/db';
import {
  MessageSquareCode, CheckCircle2, XCircle, RefreshCw, Smartphone,
  Info, Wifi, WifiOff, MessageCircle, Bot, Zap, Shield,
  PhoneCall, Settings2, Activity, Copy, ExternalLink, AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'qr_ready';

interface ConnectionLog {
  id: string;
  timestamp: Date;
  event: string;
  status: 'success' | 'info' | 'error';
}

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; label: string; bg: string }> = {
  connected: { color: 'text-green-400', label: 'Conectado', bg: 'bg-green-500/10 border-green-500/30' },
  disconnected: { color: 'text-red-400', label: 'Desconectado', bg: 'bg-red-500/10 border-red-500/30' },
  connecting: { color: 'text-amber-400', label: 'Conectando...', bg: 'bg-amber-500/10 border-amber-500/30' },
  qr_ready: { color: 'text-blue-400', label: 'Aguardando Leitura', bg: 'bg-blue-500/10 border-blue-500/30' },
};

export default function WhatsappPage() {
  const { toast } = useToast();
  const company = db.getCurrentCompany();
  const companyId = company?.id;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  // Auto-set instance name from company slug
  const [instanceName, setInstanceName] = useState(() => {
    const c = db.getCurrentCompany();
    return c?.slug ? `domus-${c.slug}`.slice(0, 32) : 'domus-bot';
  });
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrCountdown, setQrCountdown] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null); // null = checking
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLog[]>([]);

  // Notification settings
  const [aiEnabled, setAiEnabled] = useState(true);
  const [notifyAppointments, setNotifyAppointments] = useState(true);
  const [notifyReminders, setNotifyReminders] = useState(true);
  const [notifyCancellations, setNotifyCancellations] = useState(true);

  // Send test message state
  const [testPhone, setTestPhone] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = useCallback((event: string, logStatus: ConnectionLog['status']) => {
    setConnectionLogs(prev => [
      { id: `log-${Date.now()}-${Math.random()}`, timestamp: new Date(), event, status: logStatus },
      ...prev.slice(0, 29),
    ]);
  }, []);

  // Load saved state from db
  useEffect(() => {
    if (!companyId) return;
    const wa = db.getWhatsAppConnections(companyId)[0];
    if (wa) {
      setPhoneNumber(wa.phone_number ?? null);
      setInstanceName(wa.instance_name ?? 'domus-bot');
    }
    addLog('Painel de conexão WhatsApp carregado', 'info');
  }, [companyId, addLog]);

  // Check if Evolution API is configured and get current status
  const checkStatus = useCallback(async (instance: string) => {
    try {
      const res = await fetch(`/api/whatsapp/status?instanceName=${encodeURIComponent(instance)}`);
      const data = await res.json();
      setIsConfigured(data.configured);

      if (data.configured) {
        if (data.state === 'open') {
          setStatus('connected');
          if (data.phoneNumber) setPhoneNumber(data.phoneNumber);
          // Save to db
          if (companyId) {
            db.saveWhatsAppConnections([{
              id: 'w1',
              company_id: companyId,
              status: 'connected',
              phone_number: data.phoneNumber ?? null,
              instance_name: instance,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }]);
          }
          return 'open';
        } else if (data.state === 'close') {
          if (status === 'connected') {
            addLog('Sessão encerrada remotamente', 'error');
            setStatus('disconnected');
          }
          return 'close';
        }
      } else {
        setStatus('disconnected');
      }
    } catch {
      // API not reachable
      setIsConfigured(false);
    }
    return 'unknown';
  }, [companyId, status, addLog]);

  // Initial status check
  useEffect(() => {
    checkStatus(instanceName);
  }, [instanceName]); // eslint-disable-line

  // Start polling when QR is shown or connected
  const startPolling = useCallback((instance: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      const state = await checkStatus(instance);
      if (state === 'open') {
        clearInterval(pollingRef.current!);
        setQrBase64(null);
        if (qrTimerRef.current) clearInterval(qrTimerRef.current);
        addLog('WhatsApp pareado com sucesso! Sessão ativa.', 'success');
        toast('WhatsApp conectado com sucesso!', 'success', '✅ Conectado');
      }
    }, 3000); // Poll every 3 seconds
  }, [checkStatus, addLog, toast]);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (qrTimerRef.current) clearInterval(qrTimerRef.current);
    };
  }, []);

  // QR countdown timer
  useEffect(() => {
    if (status === 'qr_ready') {
      setQrCountdown(60);
      qrTimerRef.current = setInterval(() => {
        setQrCountdown(prev => {
          if (prev <= 1) {
            clearInterval(qrTimerRef.current!);
            if (pollingRef.current) clearInterval(pollingRef.current);
            setStatus('disconnected');
            setQrBase64(null);
            addLog('QR Code expirou. Clique em "Gerar QR Code" novamente.', 'error');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (qrTimerRef.current) clearInterval(qrTimerRef.current);
    };
  }, [status, addLog]);

  const handleConnect = useCallback(async () => {
    setIsLoading(true);
    setStatus('connecting');
    setQrBase64(null);
    addLog(`Criando instância "${instanceName}" na Evolution API...`, 'info');
    toast('Gerando QR Code de conexão...', 'info', 'Conectando');

    try {
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName, companyId }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        addLog(`Erro: ${data.error}`, 'error');
        toast(data.error ?? 'Falha ao gerar QR Code', 'error', 'Erro');
        setStatus('disconnected');
        setIsLoading(false);
        return;
      }

      if (data.base64) {
        setQrBase64(data.base64);
        setStatus('qr_ready');
        addLog('QR Code gerado! Escaneie com seu WhatsApp.', 'success');
        toast('QR Code pronto! Escaneie com seu celular.', 'success', 'QR Pronto');
        startPolling(instanceName);
      } else {
        // May already be connected
        const state = await checkStatus(instanceName);
        if (state === 'open') {
          addLog('Instância já estava conectada!', 'success');
          toast('WhatsApp já está conectado!', 'success', 'Conectado');
        } else {
          addLog('QR Code não retornado pela API. Verifique a configuração.', 'error');
          toast('Não foi possível obter o QR Code.', 'error', 'Erro');
          setStatus('disconnected');
        }
      }
    } catch (err: any) {
      addLog(`Erro de rede: ${err.message}`, 'error');
      toast('Erro de rede ao conectar à Evolution API', 'error', 'Erro');
      setStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  }, [instanceName, addLog, toast, startPolling, checkStatus]);

  const handleDisconnect = useCallback(async () => {
    setIsLoading(true);
    addLog('Encerrando sessão WhatsApp...', 'info');

    if (pollingRef.current) clearInterval(pollingRef.current);
    if (qrTimerRef.current) clearInterval(qrTimerRef.current);

    try {
      await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName }),
      });
    } catch {}

    setStatus('disconnected');
    setPhoneNumber(null);
    setQrBase64(null);
    if (companyId) {
      db.saveWhatsAppConnections([{
        id: 'w1', company_id: companyId, status: 'disconnected',
        phone_number: null, instance_name: instanceName,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }]);
      db.logAudit(companyId, db.getCurrentUser()?.id ?? null, 'whatsapp_disconnected', {});
    }
    addLog('WhatsApp desconectado.', 'error');
    toast('WhatsApp desconectado.', 'warning', 'Desconectado');
    setIsLoading(false);
  }, [instanceName, companyId, addLog, toast]);

  const handleTestSend = useCallback(async () => {
    if (status !== 'connected') {
      toast('Conecte o WhatsApp primeiro.', 'warning', 'Atenção');
      return;
    }
    if (!testPhone) {
      toast('Digite o número para testar.', 'warning', 'Atenção');
      return;
    }
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName,
          phone: testPhone,
          message: `✅ *Teste DOMUS BARBER* — Sua integração está funcionando!\n\nHorário: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        addLog(`Mensagem de teste enviada para ${testPhone}`, 'success');
        toast('Mensagem enviada com sucesso!', 'success', 'Enviado');
      } else {
        addLog(`Falha ao enviar para ${testPhone}: ${data.error}`, 'error');
        toast(data.error ?? 'Falha ao enviar', 'error', 'Erro');
      }
    } catch (err: any) {
      toast('Erro ao enviar mensagem de teste', 'error', 'Erro');
    } finally {
      setIsSendingTest(false);
    }
  }, [status, testPhone, instanceName, addLog, toast]);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/whatsapp/webhook`
    : '/api/whatsapp/webhook';

  const cfg = STATUS_CONFIG[status];

  return (
    <DashboardLayout>
      <PageHeader
        title="Conexão WhatsApp"
        description="Vincule seu WhatsApp para enviar lembretes automáticos e ativar a IA de atendimento DOMUS AI."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Connection Card */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* API Not Configured Warning */}
          {isConfigured === false && (
            <Card className="border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-amber-400 mb-1">Evolution API não configurada</p>
                  <p className="text-muted-foreground text-xs leading-relaxed mb-3">
                    Para usar a integração real do WhatsApp, você precisa de uma instância da <strong>Evolution API</strong> rodando.
                    Configure as variáveis de ambiente abaixo no arquivo <code className="bg-secondary/80 px-1 rounded">.env.local</code>:
                  </p>
                  <div className="bg-black/40 rounded-lg p-3 font-mono text-xs text-green-400 space-y-1">
                    <p>EVOLUTION_API_URL=<span className="text-amber-300">https://sua-evolution-api.com</span></p>
                    <p>EVOLUTION_API_KEY=<span className="text-amber-300">sua-chave-aqui</span></p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <a
                      href="https://doc.evolution-api.com/v2/pt/get-started/introduction"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Documentação Evolution API
                    </a>
                    <span className="text-muted-foreground">·</span>
                    <a
                      href="https://github.com/EvolutionAPI/evolution-api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> GitHub
                    </a>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Status Card */}
          <Card className="border border-border/40">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/20 mb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquareCode className="w-5 h-5 text-primary" />
                  Status da Integração
                </CardTitle>
                <CardDescription>Pareamento do WhatsApp com o DOMUS BARBER</CardDescription>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-400 animate-pulse' : status === 'connecting' || status === 'qr_ready' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`} />
                {cfg.label}
              </div>
            </CardHeader>
            <CardContent>
              {/* Instance name input */}
              {status === 'disconnected' && (
                <div className="mb-6">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Nome da Instância</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={instanceName}
                      onChange={e => setInstanceName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      placeholder="domus-bot"
                      className="flex-1 bg-secondary border border-border/80 text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:border-primary/60 transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Use um nome único por barbearia. Ex: barbearia-hupp</p>
                </div>
              )}

              {/* Disconnected State */}
              {status === 'disconnected' && (
                <div className="flex flex-col items-center justify-center p-10 text-center border-2 border-dashed border-border/60 rounded-xl bg-secondary/10">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/50 border border-border/40 flex items-center justify-center mb-4">
                    <WifiOff className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h4 className="font-bold text-foreground mb-2">WhatsApp não conectado</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
                    Clique abaixo para gerar um QR Code real e parear seu WhatsApp Business ou pessoal com o sistema DOMUS BARBER.
                  </p>
                  <Button onClick={handleConnect} isLoading={isLoading}>
                    <Zap className="w-4 h-4 mr-2" />
                    Gerar QR Code de Conexão
                  </Button>
                </div>
              )}

              {/* Connecting State */}
              {status === 'connecting' && (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <RefreshCw className="w-12 h-12 text-primary animate-spin mb-4" />
                  <h4 className="font-bold text-foreground mb-2">Criando Instância na API</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Configurando o túnel seguro via Evolution API...
                  </p>
                </div>
              )}

              {/* QR Ready State */}
              {status === 'qr_ready' && (
                <div className="flex flex-col md:flex-row items-center gap-8 p-4 justify-center">
                  <div className="flex flex-col items-center gap-3">
                    {qrBase64 ? (
                      <div className="p-3 bg-white rounded-2xl shadow-2xl">
                        {/* Real QR Code from Evolution API */}
                        <img
                          src={qrBase64}
                          alt="QR Code WhatsApp"
                          className="w-52 h-52 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-52 h-52 bg-secondary/50 rounded-2xl border border-border/40 flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-amber-400">
                      <RefreshCw className="w-3.5 h-3.5" />
                      QR expira em <span className="font-bold text-lg tabular-nums">{qrCountdown}s</span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleConnect}
                      isLoading={isLoading}
                      className="text-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> Gerar novo QR
                    </Button>
                  </div>

                  <div className="flex flex-col gap-4 max-w-sm text-left">
                    <h4 className="font-bold text-foreground text-sm">Como conectar:</h4>
                    <ol className="space-y-3 text-xs text-muted-foreground list-decimal pl-4">
                      <li>Abra o <strong className="text-foreground">WhatsApp</strong> no seu celular.</li>
                      <li>Toque nos <strong className="text-foreground">três pontos</strong> → <strong className="text-foreground">Aparelhos conectados</strong>.</li>
                      <li>Toque em <strong className="text-foreground">Conectar um aparelho</strong>.</li>
                      <li>Aponte a câmera para o <strong className="text-primary">QR Code ao lado</strong>.</li>
                      <li>Aguarde a confirmação automática nesta tela.</li>
                    </ol>
                    <p className="text-[10px] text-muted-foreground/60 italic bg-secondary/30 rounded-lg p-2">
                      🔐 A conexão é segura. O DOMUS BARBER nunca armazena suas mensagens pessoais.
                    </p>
                  </div>
                </div>
              )}

              {/* Connected State */}
              {status === 'connected' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-4 p-5 rounded-xl border border-green-500/20 bg-green-500/5">
                    <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-bold text-green-400 mb-3">Conexão Ativa e Funcionando</h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {[
                          { label: 'Número Conectado', value: phoneNumber ?? 'Detectando...' },
                          { label: 'Instância ID', value: instanceName },
                          { label: 'Status da IA', value: aiEnabled ? '🤖 Ativa' : '⏸️ Pausada' },
                          { label: 'Última Verificação', value: format(new Date(), 'HH:mm:ss') },
                        ].map((item) => (
                          <div key={item.label}>
                            <p className="text-muted-foreground">{item.label}</p>
                            <p className="font-semibold text-foreground font-mono">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Test message send */}
                  <div className="flex flex-col gap-2 p-4 rounded-xl border border-border/40 bg-secondary/10">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enviar Mensagem de Teste</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testPhone}
                        onChange={e => setTestPhone(e.target.value)}
                        placeholder="DDD + Número (ex: 11999998888)"
                        className="flex-1 bg-secondary border border-border/80 text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:border-primary/60 transition-colors"
                      />
                      <Button onClick={handleTestSend} isLoading={isSendingTest} variant="secondary">
                        <PhoneCall className="w-4 h-4 mr-1" /> Testar
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={handleDisconnect} isLoading={isLoading} className="text-red-400 border-red-500/30 hover:bg-red-500/10">
                      <XCircle className="w-4 h-4 mr-2" /> Desconectar
                    </Button>
                    <Button variant="secondary" onClick={() => checkStatus(instanceName)}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Verificar Status
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Webhook URL Card */}
          <Card className="border border-border/40">
            <CardHeader className="border-b border-border/20 pb-3 mb-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-primary" />
                URL do Webhook (Evolution API)
              </CardTitle>
              <CardDescription className="text-[10px]">Configure este endpoint na sua Evolution API para receber mensagens em tempo real.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2.5">
                <code className="text-xs text-green-400 font-mono flex-1 truncate">{webhookUrl}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(webhookUrl); toast('URL copiada!', 'success', 'Copiado'); }}
                  className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all cursor-pointer shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                No painel da Evolution API: Instâncias → {instanceName} → Webhook → Cole a URL acima e ative os eventos: <code>messages.upsert</code>, <code>connection.update</code>, <code>qrcode.updated</code>
              </p>
            </CardContent>
          </Card>

          {/* Connection Logs */}
          <Card className="border border-border/40">
            <CardHeader className="border-b border-border/20 pb-3 mb-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Log de Eventos em Tempo Real
              </CardTitle>
            </CardHeader>
            <CardContent>
              {connectionLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum evento registrado ainda.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {connectionLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 text-xs">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${log.status === 'success' ? 'bg-green-400' : log.status === 'error' ? 'bg-red-400' : 'bg-blue-400'}`} />
                      <span className="text-muted-foreground font-mono shrink-0">{format(log.timestamp, 'HH:mm:ss')}</span>
                      <span className="text-foreground">{log.event}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Notification Toggles */}
          <Card className="border border-border/40">
            <CardHeader className="border-b border-border/20 pb-3 mb-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                Notificações Automáticas
              </CardTitle>
              <CardDescription className="text-[10px]">Ativas quando WhatsApp estiver conectado.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Switch label="🤖 IA de Atendimento" checked={aiEnabled} onChange={() => setAiEnabled(!aiEnabled)} />
              <Switch label="📅 Confirmação de Agendamento" checked={notifyAppointments} onChange={() => setNotifyAppointments(!notifyAppointments)} />
              <Switch label="⏰ Lembretes (24h e 2h antes)" checked={notifyReminders} onChange={() => setNotifyReminders(!notifyReminders)} />
              <Switch label="❌ Alerta de Cancelamento" checked={notifyCancellations} onChange={() => setNotifyCancellations(!notifyCancellations)} />
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Status da IA', value: aiEnabled && status === 'connected' ? 'Ativa' : 'Off', icon: <Bot className="w-4 h-4 text-primary" /> },
              { label: 'Sessão', value: status === 'connected' ? '🟢 Online' : '🔴 Offline', icon: <Activity className="w-4 h-4 text-primary" /> },
              { label: 'Instância', value: instanceName, icon: <Smartphone className="w-4 h-4 text-primary" /> },
              { label: 'Webhook', value: '✅ Ativo', icon: <Wifi className="w-4 h-4 text-primary" /> },
            ].map((stat) => (
              <Card key={stat.label} className="border border-border/40 p-4 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">{stat.icon}<span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{stat.label}</span></div>
                <span className="font-bold text-foreground text-xs font-mono truncate">{stat.value}</span>
              </Card>
            ))}
          </div>

          {/* Integration Info */}
          <Card className="border border-border/40 p-4 bg-secondary/10">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-foreground mb-2">Como Funciona</p>
                <div className="space-y-2 text-muted-foreground">
                  <p>1️⃣ Instale a <strong className="text-foreground">Evolution API</strong> (free/open-source) em um servidor.</p>
                  <p>2️⃣ Configure as variáveis de ambiente no arquivo <code className="bg-secondary/60 px-1 rounded">.env.local</code>.</p>
                  <p>3️⃣ Clique em <strong className="text-foreground">Gerar QR Code</strong> e escaneie com seu WhatsApp.</p>
                  <p>4️⃣ Pronto! O sistema envia lembretes e responde clientes automaticamente.</p>
                </div>
                <a
                  href="https://doc.evolution-api.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline mt-3"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ver documentação completa
                </a>
              </div>
            </div>
          </Card>

          {/* Security */}
          <Card className="border border-border/40 p-4 bg-secondary/10">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-foreground mb-1">Dados Seguros</p>
                <p className="text-muted-foreground">
                  Suas credenciais ficam apenas no servidor. Comunicação via HTTPS. Sessões isoladas por estabelecimento.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
