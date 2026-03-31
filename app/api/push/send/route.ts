// app/api/push/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Web Push manual implementation (no external library needed)
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPrivateKey: string,
  vapidPublicKey: string,
  vapidSubject: string
) {
  // Build VAPID JWT header + claims
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const claims = btoa(JSON.stringify({
    aud: audience,
    exp: now + 3600,
    sub: vapidSubject,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const signingInput = `${header}.${claims}`;

  // Import private key
  const privKeyBytes = Uint8Array.from(
    atob(vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  );

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    privKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sigB64 = btoa(Array.from(new Uint8Array(signature), c => String.fromCharCode(c)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const jwt = `${signingInput}.${sigB64}`;

  // Encrypt payload with Web Push encryption (RFC 8291)
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Import receiver's public key
  const receiverPubKeyBytes = Uint8Array.from(
    atob(subscription.keys.p256dh.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  );
  const receiverPubKey = await crypto.subtle.importKey(
    'raw', receiverPubKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false, []
  );

  // Generate sender key pair
  const senderKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, ['deriveBits']
  );
  const senderPubKeyRaw = await crypto.subtle.exportKey('raw', senderKeyPair.publicKey);

  // Derive shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: receiverPubKey },
    senderKeyPair.privateKey, 256
  );

  // HKDF expand
  const authBytes = Uint8Array.from(
    atob(subscription.keys.auth.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  );

  const authImported = await crypto.subtle.importKey('raw', authBytes, 'HKDF', false, ['deriveBits']);
  const prk = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: sharedBits, info: new Uint8Array(0) },
    authImported, 256
  );

  const prkKey = await crypto.subtle.importKey('raw', prk, 'HKDF', false, ['deriveBits']);

  // Content encryption key
  const cekInfo = new Uint8Array([...encoder.encode('Content-Encoding: aes128gcm\0'), 0x01]);
  const cek = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo },
    prkKey, 128
  );

  // Nonce
  const nonceInfo = new Uint8Array([...encoder.encode('Content-Encoding: nonce\0'), 0x01]);
  const nonce = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo },
    prkKey, 96
  );

  // Encrypt
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const paddedPayload = new Uint8Array([...payloadBytes, 0x02]);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey, paddedPayload
  );

  // Build HTTP/2 push message body
  const senderPubKeyBytes = new Uint8Array(senderPubKeyRaw);
  const recordSize = 4096;
  const header2 = new Uint8Array(21 + senderPubKeyBytes.length);
  new DataView(header2.buffer).setUint32(0, recordSize);
  header2[4] = senderPubKeyBytes.length;
  header2.set(senderPubKeyBytes, 5);
  header2.set(salt, 5 + senderPubKeyBytes.length - 16);

  const body = new Uint8Array([...salt, ...new Uint8Array(4), senderPubKeyBytes.length, ...senderPubKeyBytes, ...new Uint8Array(encrypted)]);

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
      'TTL': '86400',
    },
    body,
  });

  return res.status;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, title, body, url, tag } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (!subs?.length) {
      return NextResponse.json({ sent: 0 });
    }

    const payload = JSON.stringify({ title, body, url: url || '/', tag: tag || 'herphase' });
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
    const vapidSubject = 'mailto:support@herphase.app';

    let sent = 0;
    for (const sub of subs) {
      try {
        const status = await sendWebPush(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload, vapidPrivateKey, vapidPublicKey, vapidSubject
        );
        if (status === 201 || status === 200) sent++;
        // If 410 Gone, subscription is expired — delete it
        if (status === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      } catch (e) {
        console.error('Failed to send push to subscription:', e);
      }
    }

    return NextResponse.json({ sent });
  } catch (err) {
    console.error('Push send error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
