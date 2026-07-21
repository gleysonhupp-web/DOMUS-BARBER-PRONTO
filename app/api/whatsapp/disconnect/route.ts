// app/api/whatsapp/disconnect/route.ts
import { NextRequest, NextResponse } from 'next/server';

const EVO_URL = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
const EVO_KEY = process.env.EVOLUTION_API_KEY;

export async function POST(req: NextRequest) {
  if (!EVO_URL || !EVO_KEY) {
    return NextResponse.json({ ok: true }); // no-op in mock mode
  }

  const { instanceName } = await req.json();

  try {
    // Logout (keepes instance but disconnects session)
    await fetch(`${EVO_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': EVO_KEY },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[WA disconnect error]', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
