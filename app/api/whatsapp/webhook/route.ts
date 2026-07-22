// app/api/whatsapp/webhook/route.ts
// This route receives incoming messages from Evolution API webhooks and responds with AI.

import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
let EVO_URL = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
if (EVO_URL && !EVO_URL.startsWith('http')) {
  EVO_URL = `https://${EVO_URL}`;
}
const EVO_KEY = process.env.EVOLUTION_API_KEY;

// Temporary memory store for chat history (will reset on server restart, use DB in prod)
// structure: { [phone]: [{ role: 'user'|'assistant', content: string }] }
const memoryStore: Record<string, { role: string; content: string }[]> = {};

export async function POST(req: NextRequest) {
  try {
    const companyId = req.nextUrl.searchParams.get('companyId');
    const payload = await req.json();
    const event = payload?.event ?? payload?.type ?? 'unknown';
    const instanceName = payload?.instance ?? payload?.instanceName ?? 'unknown';

    console.log(`[WA Webhook] event=${event} instance=${instanceName}`);

    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT' || event === 'SEND_MESSAGE') {
      // Robust message extraction for Evolution API v1 & v2
      let messages: any[] = [];
      if (Array.isArray(payload?.data?.messages)) {
        messages = payload.data.messages;
      } else if (Array.isArray(payload?.data)) {
        messages = payload.data;
      } else if (payload?.data?.key) {
        messages = [payload.data];
      } else if (payload?.key) {
        messages = [payload];
      }

      console.log(`[WA Webhook] Extracted ${messages.length} message(s)`);

      for (const msg of messages) {
        if (!msg || msg.key?.fromMe) continue; // Ignore own messages
        if (msg.key?.remoteJid?.endsWith('@g.us')) continue; // Ignore group messages

        const rawFrom = msg.key?.remoteJid || '';
        const from = rawFrom.split('@')[0].split(':')[0];
        const text =
          msg.message?.conversation ??
          msg.message?.extendedTextMessage?.text ??
          msg.message?.imageMessage?.caption ??
          msg.message?.videoMessage?.caption ??
          '';

        if (!from || !text) continue;

        console.log(`[WA Webhook] Message from ${from}: ${text}`);

        // If OPENAI is not configured, we send a fallback response
        if (!OPENAI_API_KEY) {
          console.warn('[WA Webhook] OPENAI_API_KEY is not configured. Sending fallback message.');
          await sendWhatsAppMessage(instanceName, from, 'Olá! Atendimento automático DOMUS AI ativo. (Configure sua OPENAI_API_KEY no Vercel para respostas inteligentes).');
          continue;
        }

        // 1. Manage Context / History
        if (!memoryStore[from]) memoryStore[from] = [];
        memoryStore[from].push({ role: 'user', content: text });

        // Keep only last 10 messages for context window
        if (memoryStore[from].length > 10) {
          memoryStore[from] = memoryStore[from].slice(memoryStore[from].length - 10);
        }

        // 2. Generate AI Response
        const systemPrompt = `Você é a DOMUS AI, assistente virtual inteligente da barbearia.
Seu objetivo é atender o cliente de forma educada, amigável e direta no WhatsApp.
Serviços oferecidos: Corte de Cabelo (R$ 45), Barba (R$ 35), Combo Cabelo + Barba (R$ 70), Sobrancelha (R$ 15), Pigmentação (R$ 40).
Horário de funcionamento: Terça a Sábado das 08h às 19h.
Ajude o cliente a escolher serviços e agendar um horário. Responda em frases curtas e amigáveis com emojis moderados.`;

        const aiResponseText = await getOpenAIResponse(systemPrompt, memoryStore[from]);

        // 3. Save AI response to memory
        if (aiResponseText) {
          memoryStore[from].push({ role: 'assistant', content: aiResponseText });
          
          // 4. Send back via WhatsApp
          await sendWhatsAppMessage(instanceName, from, aiResponseText);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[WA Webhook error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function getOpenAIResponse(systemPrompt: string, history: { role: string; content: string }[]) {
  const lastUserMsg = [...history].reverse().find(m => m.role === 'user')?.content?.toLowerCase() || '';

  try {
    // Try gpt-4o-mini first, fallback to gpt-3.5-turbo
    let res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history
        ],
        temperature: 0.7,
        max_tokens: 200
      })
    });

    if (!res.ok) {
      // Fallback attempt with gpt-3.5-turbo
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...history
          ],
          temperature: 0.7,
          max_tokens: 200
        })
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('[OpenAI Error]', errText);
      return generateSmartFallback(lastUserMsg);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? generateSmartFallback(lastUserMsg);
  } catch (err) {
    console.error('[OpenAI Exception]', err);
    return generateSmartFallback(lastUserMsg);
  }
}

function generateSmartFallback(text: string): string {
  const t = text.toLowerCase();
  
  if (t.includes('horario') || t.includes('horário') || t.includes('aberto') || t.includes('funciona') || t.includes('abre')) {
    return '💈 *Horário de Funcionamento:*\nAtendemos de *Terça a Sábado*, das *08:00 às 19:00*.\n\nDeseja agendar um horário hoje?';
  }
  
  if (t.includes('preco') || t.includes('preço') || t.includes('valor') || t.includes('quanto') || t.includes('tabela') || t.includes('servico') || t.includes('serviço')) {
    return '✂️ *Tabela de Serviços & Preços:*\n\n• Corte Masculino: R$ 45,00\n• Barba Completa: R$ 35,00\n• Combo (Corte + Barba): R$ 70,00\n• Sobrancelha: R$ 15,00\n\nComo posso te ajudar a agendar?';
  }

  if (t.includes('agend') || t.includes('marcar') || t.includes('vaga') || t.includes('horario livre') || t.includes('link')) {
    return '📅 *Agendamento Online Instantâneo:*\n\nVocê pode escolher o melhor horário e profissional diretamente pelo nosso link:\n👉 https://domus-barber-pronto.vercel.app/agendar/barbearia-hupp\n\nÉ rápido e confirma na hora!';
  }

  if (t.includes('oi') || t.includes('olá') || t.includes('ola') || t.includes('bom dia') || t.includes('boa tarde') || t.includes('boa noite') || t.includes('ei')) {
    return '👋 *Olá! Seja muito bem-vindo à Barbearia!* 💈\n\nSou a *DOMUS AI*, sua assistente virtual. Como posso te ajudar hoje?\n\n1️⃣ Consultar Serviços & Preços\n2️⃣ Horários de Funcionamento\n3️⃣ Agendar Atendimento Online';
  }

  return '💈 *DOMUS AI — Barbearia*\n\nOlá! Como posso te ajudar hoje?\n• Nosso horário: Terça a Sábado das 08h às 19h\n• Para agendar online acesse: https://domus-barber-pronto.vercel.app/agendar/barbearia-hupp';
}

async function sendWhatsAppMessage(instanceName: string, number: string, text: string) {
  if (!EVO_URL || !EVO_KEY) return;
  
  try {
    await fetch(`${EVO_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVO_KEY
      },
      body: JSON.stringify({
        number,
        text,
        delay: 1500,
        presence: 'composing'
      })
    });
    console.log(`[WA] Replied to ${number}`);
  } catch (err) {
    console.error('[WA Send Message Error]', err);
  }
}

// Evolution API may also send GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'DOMUS BARBER Webhook Active' });
}
