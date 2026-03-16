import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { computeTotals, zeroTotals } from '@/lib/reports';
import type { DailyTotals } from '@/types';

export async function GET(request: NextRequest) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { supabase } = auth;

  const date = request.nextUrl.searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date query parameter is required (YYYY-MM-DD)' }, { status: 400 });
  }

  const d = new Date(date + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startDate = monday.toISOString().split('T')[0];
  const endDate = sunday.toISOString().split('T')[0];

  const { data: logs, error } = await supabase
    .from('food_logs')
    .select('*, foods(*), serving_sizes(*)')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    console.error('Error fetching weekly report:', error);
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
  const current = new Date(monday);
  for (let i = 0; i < 7; i++) {
    const dayStr = current.toISOString().split('T')[0];
    const dayLogs = logsByDate.get(dayStr) || [];
    allDays.push(dayLogs.length > 0 ? computeTotals(dayLogs, dayStr) : zeroTotals(dayStr));
    current.setDate(current.getDate() + 1);
  }

  return NextResponse.json({ startDate, endDate, days: allDays });
}
