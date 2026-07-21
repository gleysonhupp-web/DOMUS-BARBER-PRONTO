// app/api/whatsapp/connect/route.ts
// Automatically creates a WhatsApp instance for each company in the SaaS
import { NextRequest, NextResponse } from 'next/server';

const EVO_URL = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
const EVO_KEY = process.env.EVOLUTION_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://domus-barber-pronto.vercel.app';

export async function POST(req: NextRequest) {
  if (!EVO_URL || !EVO_KEY) {
    return NextResponse.json(
      { error: 'Evolution API não configurada. Configure EVOLUTION_API_URL e EVOLUTION_API_KEY nas variáveis de ambiente do Vercel.' },
      { status: 503 }
    );
  }

  const { instanceName, companyId } = await req.json();
  if (!instanceName) {
    return NextResponse.json({ error: 'instanceName é obrigatório' }, { status: 400 });
  }

  // Clean instance name to avoid special chars
  const cleanInstance = instanceName
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 32);

  const webhookUrl = `${APP_URL}/api/whatsapp/webhook?companyId=${companyId || ''}`;

  try {
    // 1. Try to create the instance (idempotent — if exists, it's fine)
    const createRes = await fetch(`${EVO_URL}/instance/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
      body: JSON.stringify({
        instanceName: cleanInstance,
        token: EVO_KEY,
        qrcode: true,
        number: '',
        integration: 'WHATSAPP-BAILEYS',
        webhook: {
          url: webhookUrl,
          byEvents: true,
          base64: false,
          events: [
            'APPLICATION_STARTUP',
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'CONNECTION_UPDATE',
            'QRCODE_UPDATED',
          ],
        },
        settings: {
          rejectCall: true,
          msgCall: 'No momento não posso atender ligações. Envie uma mensagem!',
          groupsIgnore: true,
          alwaysOnline: true,
          readMessages: true,
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      // 409 = already exists, that's fine, proceed
      if (createRes.status !== 409) {
        console.warn(`[WA] create failed (${createRes.status}): ${errText}`);
      }
    }

    // 2. Fetch QR Code to display to user
    const qrRes = await fetch(`${EVO_URL}/instance/connect/${cleanInstance}`, {
      method: 'GET',
      headers: { 'apikey': EVO_KEY },
    });

    if (!qrRes.ok) {
      const errText = await qrRes.text();
      return NextResponse.json({ error: `Falha ao gerar QR Code: ${errText}` }, { status: 502 });
    }

    const qrData = await qrRes.json();
    const base64 = qrData?.base64 ?? qrData?.qrcode?.base64 ?? null;
    const code   = qrData?.code   ?? qrData?.qrcode?.code   ?? null;

    return NextResponse.json({ base64, code, instanceName: cleanInstance });
  } catch (err: any) {
    console.error('[WA connect error]', err);
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 });
  }
}
