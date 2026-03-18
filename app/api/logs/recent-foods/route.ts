import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';

// GET /api/logs/recent-foods — returns the 10 most recently logged unique foods
export async function GET(request: NextRequest) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  // Get distinct food_ids ordered by most recent log
  const { data: recentLogs, error } = await supabase
    .from('food_logs')
    .select('food_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching recent foods:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Deduplicate to get unique food_ids in recency order
  const seen = new Set<number>();
  const foodIds: number[] = [];
  for (const log of recentLogs || []) {
    if (!seen.has(log.food_id)) {
      seen.add(log.food_id);
      foodIds.push(log.food_id);
    }
    if (foodIds.length >= 10) break;
  }

  if (foodIds.length === 0) {
    return NextResponse.json([]);
  }

  // Fetch the full food objects with serving sizes
  const { data: foods, error: foodsError } = await supabase
    .from('foods')
    .select('*, serving_sizes(*)')
    .in('id', foodIds);

  if (foodsError) {
    console.error('Error fetching foods:', foodsError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Sort by original recency order and sort serving sizes
  const foodMap = new Map((foods || []).map(f => [f.id, f]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = foodIds.map(id => foodMap.get(id)).filter(Boolean).map((f: any) => {
    if (f.serving_sizes) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      f.serving_sizes.sort((a: any, b: any) => (a.sort_order - b.sort_order) || (a.id - b.id));
    }
    return f;
  });

  return NextResponse.json(result);
}
