// app/api/push/daily-reminder/route.ts
// Called daily via Vercel Cron Job to send check-in reminders
// Vercel cron: 0 8 * * * (8:00 AM UTC daily)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PHASE_MESSAGES: Record<string, { title: string; body: string }> = {
  menstrual: {
    title: "🌙 HerPhase — menstrual phase",
    body: "Rest is productive today. Log your check-in and see how you're feeling.",
  },
  follicular: {
    title: "🌱 HerPhase — energy is building",
    body: "Your strength is returning. Log today's workout and mood.",
  },
  ovulation: {
    title: "⚡ HerPhase — peak phase",
    body: "You're at your strongest. Don't forget to log today!",
  },
  luteal: {
    title: "🍂 HerPhase — luteal phase",
    body: "Your body is winding down. Log how you're feeling today.",
  },
};

async function sendPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string
) {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
  const vapidSubject = 'mailto:support@herphase.app';

  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const claims = btoa(JSON.stringify({
    aud: audience, exp: now + 3600, sub: vapidSubject,
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const signingInput = `${header}.${claims}`;

  const privKeyBytes = Uint8Array.from(
    atob(vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  );
  const cryptoKey = await crypto.subtle.importKey(
    'raw', privKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const sigB64 = btoa(Array.from(new Uint8Array(signature), c => String.fromCharCode(c)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const jwt = `${signingInput}.${sigB64}`;

  // Simple push without encryption for cron (payload small enough)
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
      'TTL': '86400',
    },
    body: new TextEncoder().encode(payload),
  });

  return res.status;
}

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get all users with push subscriptions + their current phase
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth');

  if (!subs?.length) {
    return NextResponse.json({ sent: 0, message: 'No subscriptions' });
  }

  let sent = 0;
  const expiredIds: number[] = [];

  for (const sub of subs) {
    // Get user's current phase from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('cycle_day, cycle_length, period_length')
      .eq('id', sub.user_id)
      .single();

    // Determine phase from cycle_day
    let phase = 'follicular';
    if (profile) {
      const { cycle_day, period_length = 5, cycle_length = 28 } = profile;
      if (cycle_day <= period_length) phase = 'menstrual';
      else if (cycle_day <= Math.round(cycle_length * 0.46)) phase = 'follicular';
      else if (cycle_day <= Math.round(cycle_length * 0.57)) phase = 'ovulation';
      else phase = 'luteal';
    }

    const msg = PHASE_MESSAGES[phase] ?? PHASE_MESSAGES.follicular;
    const payload = JSON.stringify({
      title: msg.title,
      body: msg.body,
      url: '/mood',
      tag: 'daily-reminder',
    });

    try {
      const status = await sendPush(sub.endpoint, sub.p256dh, sub.auth, payload);
      if (status === 201 || status === 200) sent++;
      if (status === 410) expiredIds.push(sub.user_id);
    } catch (e) {
      console.error('Failed push for user', sub.user_id, e);
    }
  }

  // Clean up expired subscriptions
  if (expiredIds.length) {
    await supabase.from('push_subscriptions')
      .delete().in('user_id', expiredIds);
  }

  return NextResponse.json({ sent, total: subs.length });
}
