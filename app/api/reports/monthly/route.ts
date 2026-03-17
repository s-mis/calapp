import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { computeTotals, zeroTotals } from '@/lib/reports';
import type { DailyTotals } from '@/types';

export async function GET(request: NextRequest) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const month = request.nextUrl.searchParams.get('month');
  if (!month) {
    return NextResponse.json({ error: 'month query parameter is required (YYYY-MM)' }, { status: 400 });
  }

  const startDate = `${month}-01`;
  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

  const { data: logs, error } = await supabase
    .from('food_logs')
    .select('*, foods(*), serving_sizes(*)')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    console.error('Error fetching monthly report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logsByDate = new Map<string, any[]>();
  for (const log of logs || []) {
    const arr = logsByDate.get(log.date) || [];
    arr.push(log);
    logsByDate.set(log.date, arr);
  }

  const allDays: DailyTotals[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const dayStr = `${month}-${String(d).padStart(2, '0')}`;
    const dayLogs = logsByDate.get(dayStr) || [];
    allDays.push(dayLogs.length > 0 ? computeTotals(dayLogs, dayStr) : zeroTotals(dayStr));
  }

  return NextResponse.json({ month, startDate, endDate, days: allDays });
}
