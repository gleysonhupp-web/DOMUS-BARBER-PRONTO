// app/api/whatsapp/connect/route.ts
import { NextRequest, NextResponse } from 'next/server';

const EVO_URL = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
const EVO_KEY = process.env.EVOLUTION_API_KEY;

export async function POST(req: NextRequest) {
  if (!EVO_URL || !EVO_KEY) {
    return NextResponse.json(
      { error: 'Evolution API não configurada. Defina EVOLUTION_API_URL e EVOLUTION_API_KEY no .env.local' },
      { status: 503 }
    );
  }

  const { instanceName } = await req.json();
  if (!instanceName) {
    return NextResponse.json({ error: 'instanceName é obrigatório' }, { status: 400 });
  }

  try {
    // 1. Create or recreate the instance
    const createRes = await fetch(`${EVO_URL}/instance/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
      body: JSON.stringify({
        instanceName,
        token: EVO_KEY,
        qrcode: true,
        number: '',
        integration: 'WHATSAPP-BAILEYS',
      }),
    });

    if (!createRes.ok) {
      // Instance may already exist — try connecting anyway
      const errText = await createRes.text();
      console.warn(`[WA] create failed (${createRes.status}): ${errText}`);
    }

    // 2. Fetch QR code
    const qrRes = await fetch(`${EVO_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': EVO_KEY },
    });

    if (!qrRes.ok) {
      const errText = await qrRes.text();
      return NextResponse.json({ error: `Falha ao gerar QR: ${errText}` }, { status: 502 });
    }

    const qrData = await qrRes.json();
    // Evolution API returns { code, base64, count } or { qrcode: { code, base64 } }
    const base64 = qrData?.base64 ?? qrData?.qrcode?.base64 ?? null;
    const code = qrData?.code ?? qrData?.qrcode?.code ?? null;

    return NextResponse.json({ base64, code, instanceName });
  } catch (err: any) {
    console.error('[WA connect error]', err);
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 });
  }
}
