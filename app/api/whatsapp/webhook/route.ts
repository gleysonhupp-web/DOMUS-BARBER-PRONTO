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

    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      // Incoming message logic
      let messages = payload?.data?.messages || [];
      if (!Array.isArray(messages)) messages = [payload?.data]; // some evolution versions wrap differently
      
      for (const msg of messages) {
        if (!msg || msg.key?.fromMe) continue; // Ignore own messages

        const from = msg.key?.remoteJid?.replace('@s.whatsapp.net', '');
        const text = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? '';
        
        if (!from || !text) continue;

        console.log(`[WA Webhook] Message from ${from}: ${text}`);

        // If OPENAI is not configured, we can't reply intelligently
        if (!OPENAI_API_KEY) {
          console.warn('[WA Webhook] OPENAI_API_KEY is not configured. Cannot reply.');
          // Fallback static reply for testing if AI is missing
          await sendWhatsAppMessage(instanceName, from, 'Olá! O sistema de Inteligência Artificial da barbearia está em manutenção no momento. Em breve retornaremos o atendimento automático.');
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
        const systemPrompt = `Você é uma assistente virtual educada e eficiente de uma barbearia premium. 
Seu objetivo é agendar horários, tirar dúvidas sobre serviços e preços, e ser simpática.
Responda de forma curta e objetiva, ideal para o WhatsApp. Use emojis com moderação.
Os serviços disponíveis são: Corte de Cabelo, Barba, e Combos.
Peça o nome do cliente se não souber, pergunte qual serviço deseja e sugira datas e horários.
Sempre finalize de forma cordial.`;

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
        options: {
          delay: 1500, // type effect delay
          presence: 'composing'
        },
        textMessage: {
          text
        }
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
