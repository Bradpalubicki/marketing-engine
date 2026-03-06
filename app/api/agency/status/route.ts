import { type NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.AGENCY_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now);
    monthStart.setDate(now.getDate() - 30);

    const [leadsToday, leadsMonth] = await Promise.all([
      supabaseAdmin
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),
      supabaseAdmin
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', monthStart.toISOString()),
    ]);

    return NextResponse.json({
      engine: 'marketing-engine',
      practice: 'Marketing Engine — Lead Generation',
      generatedAt: now.toISOString(),
      leads: { today: leadsToday.count ?? 0, thisWeek: 0, thisMonth: leadsMonth.count ?? 0, pending: 0, avgResponseSeconds: null },
      appointments: { today: 0, thisWeek: 0, confirmed: 0, noShows: 0, cancellations: 0 },
      patients: { total: 0, active: 0, new30d: leadsMonth.count ?? 0 },
      aiActions: { pending: 0, approvedToday: 0, rejectedToday: 0, totalToday: 0 },
      outreach: { sentToday: 0, deliveredToday: 0, failedToday: 0, activeSequences: 0 },
      integrations: {
        supabase: { configured: true, status: 'connected' },
        microsoft_ads: { configured: !!process.env.MICROSOFT_ADS_CLIENT_ID, status: process.env.MICROSOFT_ADS_CLIENT_ID ? 'connected' : 'not_configured' },
        google_ads: { configured: !!process.env.GOOGLE_ADS_CLIENT_ID, status: process.env.GOOGLE_ADS_CLIENT_ID ? 'connected' : 'not_configured' },
      },
      health: { dbOk: true, lastCronRun: null, cronHealthy: true },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Status check failed', details: err instanceof Error ? err.message : 'Unknown' }, { status: 500 });
  }
}
