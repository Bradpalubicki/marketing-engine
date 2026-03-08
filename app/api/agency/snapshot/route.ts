import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.AGENCY_SNAPSHOT_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    const [leadsToday, campaignsActive, lastLead] = await Promise.all([
      supabaseAdmin
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd),
      supabaseAdmin
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabaseAdmin
        .from('leads')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    return NextResponse.json({
      timestamp: now.toISOString(),
      site_up: true,
      leads_today: leadsToday.count ?? 0,
      campaigns_active: campaignsActive.count ?? 0,
      cron_healthy: !lastLead.error,
      last_cron_run: lastLead.data?.updated_at ?? null,
      engine_type: 'marketing-engine',
      engine_version: '1.0.0',
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Snapshot failed', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
