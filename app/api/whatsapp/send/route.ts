// app/api/whatsapp/send/route.ts
import { NextRequest, NextResponse } from 'next/server';

const EVO_URL = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
const EVO_KEY = process.env.EVOLUTION_API_KEY;

export async function POST(req: NextRequest) {
  if (!EVO_URL || !EVO_KEY) {
    // Mock mode — simulate success
    return NextResponse.json({ ok: true, mock: true });
  }

  const { instanceName, phone, message } = await req.json();
  if (!instanceName || !phone || !message) {
    return NextResponse.json({ error: 'instanceName, phone e message são obrigatórios' }, { status: 400 });
  }

  // Format phone: ensure country code (55) and only digits
  const cleanPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  try {
    const res = await fetch(`${EVO_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Falha ao enviar: ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error('[WA send error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
