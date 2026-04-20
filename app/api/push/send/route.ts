// app/api/push/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// VAPID keys are required at runtime but may not be present at build time
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@herphase.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(req: NextRequest) {
  try {
    const { userId, title, body, url, tag } = await req.json();

    if (!userId || !title || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (!subs?.length) {
      return NextResponse.json({ sent: 0, message: 'No subscriptions for user' });
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || '/',
      tag: tag || 'herphase',
    });

    let sent = 0;
    const expiredIds: number[] = [];

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredIds.push(sub.id);
        } else {
          console.error('Push error for sub', sub.id, err.message);
        }
      }
    }

    if (expiredIds.length) {
      await supabase.from('push_subscriptions').delete().in('id', expiredIds);
    }

    return NextResponse.json({ sent, total: subs.length });
  } catch (err) {
    console.error('Push send error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
