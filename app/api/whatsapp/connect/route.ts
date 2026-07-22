// app/api/whatsapp/connect/route.ts
// Automatically creates a WhatsApp instance for each company in the SaaS
import { NextRequest, NextResponse } from 'next/server';

let EVO_URL = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
if (EVO_URL && !EVO_URL.startsWith('http')) {
  EVO_URL = `https://${EVO_URL}`;
}
const EVO_KEY = process.env.EVOLUTION_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://domus-barber-pronto.vercel.app';

export async function POST(req: NextRequest) {
  if (!EVO_URL || !EVO_KEY) {
    const { instanceName } = await req.json();
    
    // Create a mock QR Code (just a random base64 string or a real dummy QR)
    // We will use a static dummy base64 for the mock
    const dummyQR = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="; // 1x1 red pixel, just to not break Image tag
    
    // Simulate connection delay then set cookie
    const res = NextResponse.json({ 
      base64: dummyQR, 
      code: "MOCK-CODE-123", 
      instanceName,
      mockMode: true 
    });
    
    // In 5 seconds, the status API will read this cookie and return 'open'
    // For simplicity, we just set the cookie now
    res.cookies.set(`mock_wa_${instanceName}`, 'open', { maxAge: 60 * 60 * 24 });
    return res;
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
        integration: 'WHATSAPP-BAILEYS'
      }),
    });

    // 1.5 Explicitly set Webhook using the dedicated endpoint for maximum compatibility
    await fetch(`${EVO_URL}/webhook/set/${cleanInstance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: true,
          base64: false,
          events: [
            'APPLICATION_STARTUP',
            'MESSAGES_UPSERT',
            'CONNECTION_UPDATE',
            'QRCODE_UPDATED'
          ]
        },
        // Fallback flat format for some v2 versions
        enabled: true,
        url: webhookUrl,
        webhook_by_events: true,
        webhook_base64: false,
        events: [
          'APPLICATION_STARTUP',
          'MESSAGES_UPSERT',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED'
        ]
      })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      // 409 = already exists, 403 = forbidden/already in use
      const isAlreadyInUse = createRes.status === 409 || (createRes.status === 403 && errText.includes('already in use'));
      
      if (!isAlreadyInUse) {
        console.warn(`[WA] create failed (${createRes.status}): ${errText}`);
        return NextResponse.json({ error: `Falha ao criar instância: ${errText}` }, { status: 502 });
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
