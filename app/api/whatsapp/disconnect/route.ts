// app/api/whatsapp/disconnect/route.ts
import { NextRequest, NextResponse } from 'next/server';

let EVO_URL = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
if (EVO_URL && !EVO_URL.startsWith('http')) {
  EVO_URL = `https://${EVO_URL}`;
}
const EVO_KEY = process.env.EVOLUTION_API_KEY;

export async function POST(req: NextRequest) {
  if (!EVO_URL || !EVO_KEY) {
    return NextResponse.json({ ok: true }); // no-op in mock mode
  }

  const { instanceName } = await req.json();

  try {
    // Delete the instance completely so they can start fresh and see the QR code
    await fetch(`${EVO_URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': EVO_KEY },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[WA disconnect error]', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
