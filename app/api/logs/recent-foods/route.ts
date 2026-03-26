import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';

// GET /api/logs/recent-foods — returns the 10 most recently logged unique foods
export async function GET(request: NextRequest) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  // Single query: get recent logs with foods + serving sizes joined
  const { data: recentLogs, error } = await supabase
    .from('food_logs')
    .select('food_id, created_at, foods(*, serving_sizes(*))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching recent foods:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Deduplicate to get unique foods in recency order
  const seen = new Set<number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any[] = [];
  for (const log of recentLogs || []) {
    if (!log.foods || seen.has(log.food_id)) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const food = log.foods as any;
    if (food.brand === '__quick_add__') continue;
    seen.add(log.food_id);
    if (food.serving_sizes) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      food.serving_sizes.sort((a: any, b: any) => (a.sort_order - b.sort_order) || (a.id - b.id));
    }
    result.push(food);
    if (result.length >= 10) break;
  }

  return NextResponse.json(result);
}
