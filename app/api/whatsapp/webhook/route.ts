// app/api/whatsapp/webhook/route.ts
// This route receives incoming messages from Evolution API webhooks.
// Configure it in the Evolution API dashboard as: POST https://yourapp.com/api/whatsapp/webhook

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const event = payload?.event ?? payload?.type ?? 'unknown';
    const instanceName = payload?.instance ?? payload?.instanceName ?? 'unknown';

    console.log(`[WA Webhook] event=${event} instance=${instanceName}`);

    // Handle different event types from Evolution API
    switch (event) {
      case 'messages.upsert': {
        // Incoming message
        const msg = payload?.data;
        if (msg && !msg.key?.fromMe) {
          const from = msg.key?.remoteJid?.replace('@s.whatsapp.net', '') ?? '';
          const text = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? '';
          console.log(`[WA Webhook] Message from ${from}: ${text}`);
          // TODO: trigger AI response via DOMUS AI when integrated
        }
        break;
      }
      case 'connection.update': {
        const state = payload?.data?.state ?? 'close';
        console.log(`[WA Webhook] Connection state: ${state} on ${instanceName}`);
        break;
      }
      case 'qrcode.updated': {
        const qr = payload?.data?.qrcode;
        console.log(`[WA Webhook] QR updated for ${instanceName}: ${qr ? 'available' : 'none'}`);
        break;
      }
      default:
        console.log(`[WA Webhook] Unhandled event: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[WA Webhook error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Evolution API may also send GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'DOMUS BARBER Webhook Active' });
}
