// app/ia/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/DashboardWidgets';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Switch from '../../components/ui/Switch';
import Select from '../../components/ui/Select';
import { Textarea, Input } from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { useToast } from '../../components/ui/Toast';
import { db } from '../../services/db';
import {
  Brain, Bot, Send, Sparkles, Zap, Calendar, Users,
  MessageSquare, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp,
  ShieldCheck, Phone, Search, RefreshCw, Info,
} from 'lucide-react';
import { format, subMinutes, subHours } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────
interface AIConfig {
  aiName: string;
  tone: string;
  greeting: string;
  hourStart: string;
  hourEnd: string;
  outOfHoursMsg: string;
  allowAutoBooking: boolean;
  allowUpsell: boolean;
  allowDiscounts: boolean;
  humanTransfer: boolean;
  fallbackMsg: string;
  model: string;
  temperature: string;
  enabledServices: string[];
}

interface MockLog {
  id: string;
  time: Date;
  phone: string;
  intent: string;
  action: string;
  status: 'success' | 'error' | 'transferred';
}

const AI_TOOLS = [
  { id: 'get_services', label: 'Consultar Serviços', desc: 'Lista todos os serviços ativos e preços.' },
  { id: 'get_professionals', label: 'Listar Profissionais', desc: 'Retorna os barbeiros disponíveis.' },
  { id: 'get_available_slots', label: 'Horários Disponíveis', desc: 'Consulta agenda em tempo real.' },
  { id: 'create_appointment', label: 'Criar Agendamento', desc: 'Reserva horário para o cliente.' },
  { id: 'reschedule_appointment', label: 'Reagendar', desc: 'Move o agendamento para outro horário.' },
  { id: 'cancel_appointment', label: 'Cancelar Agendamento', desc: 'Cancela com confirmação do cliente.' },
  { id: 'get_company_info', label: 'Informações da Empresa', desc: 'Endereço, horários, redes sociais.' },
  { id: 'get_client_history', label: 'Histórico do Cliente', desc: 'Serviços anteriores e preferências.' },
  { id: 'create_client', label: 'Cadastrar Cliente', desc: 'Cria novo perfil no CRM automaticamente.' },
  { id: 'send_human_transfer', label: 'Transferir para Humano', desc: 'Notifica equipe e pausa IA.' },
];

const INTENT_LABELS: Record<string, string> = {
  agendamento: 'Agendamento',
  duvida: 'Dúvida',
  cancelamento: 'Cancelamento',
  saudacao: 'Saudação',
  preco: 'Preço',
  upsell: 'Upsell',
};

function maskPhone(phone: string): string {
  if (phone.length < 8) return phone;
  return phone.slice(0, 4) + '****' + phone.slice(-4);
}

function generateMockLogs(count: number): MockLog[] {
  const intents = ['agendamento', 'duvida', 'cancelamento', 'saudacao', 'preco', 'upsell'];
  const actions = [
    'Agendamento criado', 'Horários enviados', 'Agendamento cancelado',
    'Saudação enviada', 'Preços informados', 'Combo sugerido',
    'Transferido para humano', 'Link de agendamento enviado',
  ];
  const statuses: MockLog['status'][] = ['success', 'success', 'success', 'error', 'transferred'];
  const phones = ['5511987654321', '5521965432198', '5531943210987', '5541921098765', '5551909876543', '5561898765432'];

  return Array.from({ length: count }, (_, i) => ({
    id: `log-${i}`,
    time: subMinutes(new Date(), i * 17 + Math.floor(Math.random() * 10)),
    phone: phones[i % phones.length],
    intent: intents[i % intents.length],
    action: actions[i % actions.length],
    status: statuses[i % statuses.length],
  }));
}

const DEFAULT_CONFIG: AIConfig = {
  aiName: 'DOMUS AI',
  tone: 'profissional',
  greeting: 'Olá! Seja bem-vindo à {empresa}! 💈 Sou o DOMUS AI, assistente virtual da barbearia. Como posso te ajudar hoje?',
  hourStart: '08:00',
  hourEnd: '20:00',
  outOfHoursMsg: 'Olá! No momento estamos fora do horário de atendimento. Funcionamos das {inicio} às {fim}. Para agendar, acesse nosso link: {link}',
  allowAutoBooking: true,
  allowUpsell: true,
  allowDiscounts: false,
  humanTransfer: true,
  fallbackMsg: 'Desculpe, não consegui entender sua mensagem. Vou transferir para um atendente humano. Aguarde um momento!',
  model: 'gpt-4o-mini',
  temperature: '0.7',
  enabledServices: [],
};

const CONFIG_STORAGE_KEY = 'domus_ai_config';

export default function IAPage() {
  const { toast } = useToast();
  const company = db.getCurrentCompany();
  const user = db.getCurrentUser();

  const [aiActive, setAiActive] = useState(true);
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);
  const [mockLogs] = useState<MockLog[]>(() => generateMockLogs(8));

  // Chat simulator
  const [simulateMsg, setSimulateMsg] = useState('');
  const [chatLogs, setChatLogs] = useState([
    { sender: 'client', text: 'Oi! Qual o preço do corte + barba?', time: format(subHours(new Date(), 1), 'HH:mm') },
    { sender: 'bot', text: 'Olá! O nosso Combo Domus (Corte + Barba) está por R$ 80,00 e inclui uma bebida cortesia. 💈 Deseja agendar?', time: format(subHours(new Date(), 1), 'HH:mm') },
    { sender: 'client', text: 'Sim! Tem horário hoje à tarde?', time: format(subMinutes(new Date(), 30), 'HH:mm') },
    { sender: 'bot', text: 'Claro! Hoje temos disponível às 14h30 com Enzo Romano e às 16h com Gustavo Santos. Qual prefere?', time: format(subMinutes(new Date(), 30), 'HH:mm') },
  ]);
  const [isResponding, setIsResponding] = useState(false);

  const services = company ? db.getServices(company.id) : [];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setConfig({ ...DEFAULT_CONFIG, ...parsed });
          if (parsed.enabledServices === undefined) {
            setConfig((c) => ({ ...c, enabledServices: services.map((s) => s.id) }));
          }
        } else {
          setConfig((c) => ({ ...c, enabledServices: services.map((s) => s.id) }));
        }
      } catch {
        setConfig((c) => ({ ...c, enabledServices: services.map((s) => s.id) }));
      }
    }
  }, []);

  const updateConfig = useCallback(<K extends keyof AIConfig>(key: K, value: AIConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleService = useCallback((id: string) => {
    setConfig((prev) => ({
      ...prev,
      enabledServices: prev.enabledServices.includes(id)
        ? prev.enabledServices.filter((s) => s !== id)
        : [...prev.enabledServices, id],
    }));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    }
    if (company) {
      db.logAudit(company.id, user?.id ?? null, 'ai_config_updated', { model: config.model });
    }
    setIsSaving(false);
    toast('Configurações da DOMUS AI salvas!', 'success', 'Sucesso');
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulateMsg.trim()) return;
    const msg = simulateMsg.trim();
    setSimulateMsg('');
    setChatLogs((prev) => [...prev, { sender: 'client', text: msg, time: format(new Date(), 'HH:mm') }]);
    setIsResponding(true);
    await new Promise((r) => setTimeout(r, 1400));
    const botResponse = aiActive
      ? `Entendido! Com base na sua mensagem: "${msg.slice(0, 40)}${msg.length > 40 ? '...' : ''}", posso ajudá-lo com agendamentos, preços e informações sobre nossa barbearia. Acesse nosso link de agendamento: ${typeof window !== 'undefined' ? window.location.origin : ''}/agendar/${company?.slug ?? 'barbearia'}`
      : '(DOMUS AI pausada. Ative-a para receber respostas automáticas.)';
    setChatLogs((prev) => [...prev, { sender: 'bot', text: botResponse, time: format(new Date(), 'HH:mm') }]);
    setIsResponding(false);
  };

  const systemPromptPreview = `Você é ${config.aiName}, assistente virtual da barbearia "${company?.name ?? 'DOMUS BARBER'}".

## Identidade
- Tom de voz: ${config.tone}
- Horário de atendimento automático: ${config.hourStart} às ${config.hourEnd}

## Saudação inicial
${config.greeting.replace('{empresa}', company?.name ?? 'DOMUS BARBER')}

## Serviços disponíveis
${services.filter((s) => config.enabledServices.includes(s.id)).map((s) => `- ${s.name}: R$ ${s.price.toFixed(2)} (${s.duration_minutes} min)`).join('\n')}

## Regras de negócio
- Agendamento automático: ${config.allowAutoBooking ? 'Permitido' : 'Não permitido'}
- Oferecer combos/upsell: ${config.allowUpsell ? 'Sim' : 'Não'}
- Oferecer descontos: ${config.allowDiscounts ? 'Sim' : 'Não'}
- Transferir para humano quando não souber: ${config.humanTransfer ? 'Sim' : 'Não'}

## Mensagem de fallback
${config.fallbackMsg}

## Ferramentas disponíveis
${AI_TOOLS.map((t) => `- ${t.id}: ${t.desc}`).join('\n')}

## IMPORTANTE
- Nunca invente horários ou preços
- Nunca confirme agendamento sem verificar disponibilidade via get_available_slots
- Sempre confirme os dados antes de criar agendamento via create_appointment
- Link de agendamento: ${typeof window !== 'undefined' ? window.location.origin : 'https://domusbarber.com.br'}/agendar/${company?.slug ?? 'barbearia'}`;

  return (
    <DashboardLayout>
      <PageHeader
        title="Atendimento Automático"
        description="Configure e monitore as respostas automáticas do seu assistente virtual no WhatsApp."
      />

      {/* AI Status Hero */}
      <Card className="border border-border/40 mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center ${aiActive ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/40 border border-border'}`}>
                <Brain className={`w-7 h-7 ${aiActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {aiActive && <div className="absolute inset-0 rounded-2xl border border-primary/30 animate-ping opacity-30" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-foreground text-lg">{config.aiName}</h2>
                  <Badge variant={aiActive ? 'success' : 'outline'}>{aiActive ? 'Ativa' : 'Inativa'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Modelo: {config.model} · Temperatura: {config.temperature}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground font-semibold">{aiActive ? 'Ativa' : 'Inativa'}</span>
              <Switch label="" checked={aiActive} onChange={() => setAiActive(!aiActive)} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border/30">
            {[
              { label: 'Conversas Hoje', value: aiActive ? '23' : '—', icon: <MessageSquare className="w-4 h-4 text-primary" /> },
              { label: 'Agendamentos pela IA', value: aiActive ? '7' : '—', icon: <Calendar className="w-4 h-4 text-primary" /> },
              { label: 'Taxa de Resolução', value: aiActive ? '91%' : '—', icon: <CheckCircle className="w-4 h-4 text-green-400" /> },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">{s.icon}<span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{s.label}</span></div>
                <p className="font-extrabold text-foreground text-xl">{s.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Tabs */}
        <div className="lg:col-span-7">
          <Tabs defaultValue="config">
            <TabsList className="mb-6">
              <TabsTrigger value="config">Configuração</TabsTrigger>
              <TabsTrigger value="tools">Ferramentas</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>

            {/* Config Tab */}
            <TabsContent value="config">
              <form onSubmit={handleSave} className="space-y-5">
                {/* Identity */}
                <Card className="border border-border/40">
                  <CardHeader className="border-b border-border/20 pb-3 mb-4">
                    <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Identidade</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Nome da IA" value={config.aiName} onChange={(e) => updateConfig('aiName', e.target.value)} />
                      <Select
                        label="Tom de Voz"
                        value={config.tone}
                        onChange={(e) => updateConfig('tone', e.target.value)}
                        options={[
                          { value: 'profissional', label: 'Profissional' },
                          { value: 'casual', label: 'Casual' },
                          { value: 'amigavel', label: 'Amigável' },
                          { value: 'formal', label: 'Formal' },
                        ]}
                      />
                    </div>
                    <Textarea
                      label="Mensagem de Saudação"
                      value={config.greeting}
                      onChange={(e) => updateConfig('greeting', e.target.value)}
                      className="min-h-[80px] text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">Use {'{empresa}'} para inserir o nome da barbearia automaticamente.</p>
                  </CardContent>
                </Card>

                {/* Schedule */}
                <Card className="border border-border/40">
                  <CardHeader className="border-b border-border/20 pb-3 mb-4">
                    <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Horário de Atendimento Automático</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Input type="time" label="Início" value={config.hourStart} onChange={(e) => updateConfig('hourStart', e.target.value)} />
                      <Input type="time" label="Fim" value={config.hourEnd} onChange={(e) => updateConfig('hourEnd', e.target.value)} />
                    </div>
                    <Textarea
                      label="Mensagem Fora do Horário"
                      value={config.outOfHoursMsg}
                      onChange={(e) => updateConfig('outOfHoursMsg', e.target.value)}
                      className="min-h-[70px] text-xs"
                    />
                  </CardContent>
                </Card>

                {/* Business Rules */}
                <Card className="border border-border/40">
                  <CardHeader className="border-b border-border/20 pb-3 mb-4">
                    <CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" />Regras de Negócio</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Switch label="Permitir agendamento automático" checked={config.allowAutoBooking} onChange={() => updateConfig('allowAutoBooking', !config.allowAutoBooking)} />
                    <Switch label="Oferecer combos e upsell" checked={config.allowUpsell} onChange={() => updateConfig('allowUpsell', !config.allowUpsell)} />
                    <Switch label="Oferecer descontos configurados" checked={config.allowDiscounts} onChange={() => updateConfig('allowDiscounts', !config.allowDiscounts)} />
                    <Switch label="Transferir para humano quando não souber" checked={config.humanTransfer} onChange={() => updateConfig('humanTransfer', !config.humanTransfer)} />
                    <Textarea
                      label="Mensagem de Fallback"
                      value={config.fallbackMsg}
                      onChange={(e) => updateConfig('fallbackMsg', e.target.value)}
                      className="min-h-[70px] text-xs"
                    />
                  </CardContent>
                </Card>

                {/* Model */}
                <Card className="border border-border/40">
                  <CardHeader className="border-b border-border/20 pb-3 mb-4">
                    <CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" />Modelo de LLM</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label="Modelo"
                        value={config.model}
                        onChange={(e) => updateConfig('model', e.target.value)}
                        options={[
                          { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rápido)' },
                          { value: 'gpt-4o', label: 'GPT-4o (Alta precisão)' },
                          { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
                          { value: 'llama-3-70b', label: 'Llama 3 70B (Open)' },
                        ]}
                      />
                      <Select
                        label="Temperatura"
                        value={config.temperature}
                        onChange={(e) => updateConfig('temperature', e.target.value)}
                        options={[
                          { value: '0.2', label: '0.2 — Preciso' },
                          { value: '0.5', label: '0.5 — Alinhado' },
                          { value: '0.7', label: '0.7 — Equilibrado' },
                          { value: '0.9', label: '0.9 — Criativo' },
                        ]}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Services Checklist */}
                {services.length > 0 && (
                  <Card className="border border-border/40">
                    <CardHeader className="border-b border-border/20 pb-3 mb-4">
                      <CardTitle className="text-sm">Serviços Habilitados para IA</CardTitle>
                      <CardDescription className="text-[10px]">A IA só oferecerá os serviços selecionados.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {services.map((s) => (
                        <label key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/30 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.enabledServices.includes(s.id)}
                            onChange={() => toggleService(s.id)}
                            className="w-4 h-4 accent-amber-500 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground">{s.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">R$ {s.price.toFixed(2)}</span>
                          </div>
                        </label>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Button type="submit" isLoading={isSaving} className="w-full">Salvar Configurações da IA</Button>
              </form>

              {/* System Prompt Preview */}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setPromptVisible(!promptVisible)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
                >
                  {promptVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {promptVisible ? 'Ocultar' : 'Ver'} System Prompt Gerado
                </button>
                {promptVisible && (
                  <div className="mt-3 p-4 rounded-xl bg-[#0B0F19] border border-border/40 text-xs text-green-400/80 font-mono leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                    {systemPromptPreview}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tools Tab */}
            <TabsContent value="tools">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AI_TOOLS.map((tool) => (
                  <Card key={tool.id} className="border border-border/40 p-4 hover:border-primary/30 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                        <Zap className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <code className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{tool.id}</code>
                          <Badge variant="success" className="text-[8px] py-0 px-1">Ativa</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{tool.desc}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="mt-4 p-4 rounded-xl bg-secondary/20 border border-border/40 flex gap-3 text-xs text-muted-foreground">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p>As ferramentas são chamadas automaticamente pela IA conforme a necessidade de cada conversa. Nenhuma ação é executada sem verificação dos dados.</p>
              </div>
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs">
              <div className="space-y-2">
                {mockLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/40 hover:border-border/70 transition-all">
                    <div className={`p-2 rounded-lg shrink-0 ${log.status === 'success' ? 'bg-green-500/10 border border-green-500/20' : log.status === 'error' ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                      {log.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-400" /> : log.status === 'error' ? <XCircle className="w-4 h-4 text-red-400" /> : <RefreshCw className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{log.action}</span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5">{INTENT_LABELS[log.intent] ?? log.intent}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span className="font-mono">{maskPhone(log.phone)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{format(log.time, 'HH:mm')}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Chat Simulator */}
        <div className="lg:col-span-5">
          <Card className="border border-border/40 h-full flex flex-col">
            <CardHeader className="border-b border-border/20 pb-3 mb-2 shrink-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Simulador de Atendimento
              </CardTitle>
              <CardDescription className="text-[10px]">Teste como a IA responde em tempo real.</CardDescription>
            </CardHeader>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[350px] bg-secondary/10">
              {chatLogs.map((msg, i) => (
                <div key={i} className={`flex flex-col gap-1 max-w-[85%] ${msg.sender === 'client' ? 'self-end items-end ml-auto' : 'self-start items-start'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-bold text-muted-foreground uppercase">{msg.sender === 'client' ? 'Cliente' : config.aiName}</span>
                    <span className="text-[9px] text-muted-foreground">{msg.time}</span>
                  </div>
                  <div className={`px-3.5 py-2.5 rounded-xl text-xs leading-relaxed ${msg.sender === 'client' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card border border-border/60 text-foreground rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isResponding && (
                <div className="self-start flex items-center gap-2 text-xs text-muted-foreground italic bg-card border border-border/40 px-3.5 py-2.5 rounded-xl rounded-tl-none animate-pulse">
                  <Bot className="w-3.5 h-3.5 text-primary animate-bounce" /> {config.aiName} está digitando...
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSimulate} className="p-3 border-t border-border/40 bg-card flex gap-2 shrink-0">
              <input
                type="text"
                value={simulateMsg}
                onChange={(e) => setSimulateMsg(e.target.value)}
                placeholder="Envie uma mensagem de teste..."
                className="flex-1 bg-secondary/50 border border-border/60 rounded-lg text-xs px-3 py-2 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-all"
              />
              <Button type="submit" size="sm" className="h-9 px-3">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
