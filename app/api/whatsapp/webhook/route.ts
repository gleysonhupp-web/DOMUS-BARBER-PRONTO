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
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Fast and cheap for simple bots
        messages: [
          { role: 'system', content: systemPrompt },
          ...history
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!res.ok) {
      console.error('[OpenAI Error]', await res.text());
      return 'Desculpe, tive um pequeno problema técnico. Pode repetir?';
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? 'Erro ao processar mensagem.';
  } catch (err) {
    console.error('[OpenAI Exception]', err);
    return 'Desculpe, estou fora do ar no momento.';
  }
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
