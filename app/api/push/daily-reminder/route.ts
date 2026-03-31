// app/api/push/daily-reminder/route.ts
// Vercel cron: 0 8 * * * (8:00 AM UTC = 9:00 AM CET)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:support@herphase.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const PHASE_MESSAGES: Record<string, { title: string; body: string }> = {
  menstrual:  { title: "🌙 HerPhase", body: "Rest is productive today. Log your check-in and see how you're feeling." },
  follicular: { title: "🌱 HerPhase", body: "Your energy is building. Don't forget to log today's workout and mood!" },
  ovulation:  { title: "⚡ HerPhase", body: "Peak phase — you're at your strongest. Log today before the gym!" },
  luteal:     { title: "🍂 HerPhase", body: "Your body is winding down. Log how you're feeling and track your sleep." },
};

function getPhase(cycleDay: number, periodLength = 5, cycleLength = 28): string {
  if (cycleDay <= periodLength) return 'menstrual';
  if (cycleDay <= Math.round(cycleLength * 0.46)) return 'follicular';
  if (cycleDay <= Math.round(cycleLength * 0.57)) return 'ovulation';
  return 'luteal';
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth, id');

  if (!subs?.length) {
    return NextResponse.json({ sent: 0, message: 'No subscriptions' });
  }

  let sent = 0;
  const expiredIds: number[] = [];

  for (const sub of subs) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('cycle_day, cycle_length, period_length')
      .eq('id', sub.user_id)
      .single();

    const phase = profile
      ? getPhase(profile.cycle_day, profile.period_length, profile.cycle_length)
      : 'follicular';

    const msg = PHASE_MESSAGES[phase];
    const payload = JSON.stringify({ title: msg.title, body: msg.body, url: '/mood', tag: 'daily-reminder' });

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        expiredIds.push(sub.id);
      }
    }
  }

  if (expiredIds.length) {
    await supabase.from('push_subscriptions').delete().in('id', expiredIds);
  }

  return NextResponse.json({ sent, total: subs.length });
}
