// app/api/whatsapp/status/route.ts
import { NextRequest, NextResponse } from 'next/server';

const EVO_URL = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
const EVO_KEY = process.env.EVOLUTION_API_KEY;

export async function GET(req: NextRequest) {
  if (!EVO_URL || !EVO_KEY) {
    return NextResponse.json({ configured: false, state: 'close' });
  }

  const instanceName = req.nextUrl.searchParams.get('instanceName') ?? 'domus-bot';

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
    // Evolution API returns { instance: { state: 'open' | 'close' | 'connecting', ... } }
    const state = data?.instance?.state ?? data?.state ?? 'close';
    const phoneNumber = data?.instance?.profileName ?? data?.instance?.wuid?.split('@')[0] ?? null;

    return NextResponse.json({ configured: true, state, phoneNumber });
  } catch (err: any) {
    console.error('[WA status error]', err);
    return NextResponse.json({ configured: true, state: 'close' });
  }
}
