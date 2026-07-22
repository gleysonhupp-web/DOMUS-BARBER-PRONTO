// app/api/whatsapp/status/route.ts
import { NextRequest, NextResponse } from 'next/server';

let EVO_URL = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
if (EVO_URL && !EVO_URL.startsWith('http')) {
  EVO_URL = `https://${EVO_URL}`;
}
const EVO_KEY = process.env.EVOLUTION_API_KEY;

export async function GET(req: NextRequest) {
  if (!EVO_URL || !EVO_KEY) {
    // Modo Demonstração (Mock Mode) - Finge que está configurado para não travar a UI
    const mockStatus = {
      configured: true,
      state: req.cookies.get(`mock_wa_${req.nextUrl.searchParams.get('instanceName')}`)?.value === 'open' ? 'open' : 'close',
      phoneNumber: '5511999999999'
    };
    return NextResponse.json(mockStatus);
  }

  const rawInstance = req.nextUrl.searchParams.get('instanceName') ?? 'domus-bot';
  const instanceName = rawInstance
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 32);

  try {
    const res = await fetch(`${EVO_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': EVO_KEY },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ configured: true, state: 'close' });
    }

    const data = await res.json();
    console.log('[WA status data]', JSON.stringify(data));
    
    // Evolution API returns { instance: { state: 'open' | 'close' | 'connecting', ... } }
    const state = data?.instance?.state ?? data?.state ?? 'close';
    const phoneNumber = data?.instance?.profileName ?? data?.instance?.wuid?.split('@')[0] ?? null;

    return NextResponse.json({ configured: true, state, phoneNumber, raw: data });
  } catch (err: any) {
    console.error('[WA status error]', err);
    return NextResponse.json({ configured: true, state: 'close' });
  }
}
