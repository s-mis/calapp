import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { computeTotals } from '@/lib/reports';

export async function GET(request: NextRequest) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { supabase } = auth;

  const date = request.nextUrl.searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date query parameter is required (YYYY-MM-DD)' }, { status: 400 });
  }

  const { data: logs, error } = await supabase
    .from('food_logs')
    .select('*, foods(*), serving_sizes(*)')
    .eq('date', date);

  if (error) {
    console.error('Error fetching daily report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json(computeTotals(logs || [], date));
}
