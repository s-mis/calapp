import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { computeTotals, zeroTotals } from '@/lib/reports';
import type { DailyTotals, FoodLogWithFood } from '@/types';

const MEAL_ORDER: Record<string, number> = { breakfast: 1, lunch: 2, dinner: 3, snack: 4 };

// GET /api/dashboard?date=YYYY-MM-DD
// Combined endpoint: returns daily totals, logs, weekly report, and settings in one request
export async function GET(request: NextRequest) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const date = request.nextUrl.searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 });
  }

  // Compute week range
  const d = new Date(date + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const startDate = monday.toISOString().split('T')[0];
  const endDate = sunday.toISOString().split('T')[0];

  // Fire all queries in parallel (single auth validation!)
  const [logsResult, weeklyLogsResult, settingsResult] = await Promise.all([
    supabase
      .from('food_logs')
      .select('*, food:foods!inner(*), serving_size:serving_sizes(*)')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('created_at'),
    supabase
      .from('food_logs')
      .select('*, foods(*), serving_sizes(*)')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate),
    supabase
      .from('settings')
      .select('key, value')
      .eq('user_id', user.id),
  ]);

  // Process logs for display
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedLogs = (logsResult.data || []).sort((a: any, b: any) => {
    const orderDiff = (MEAL_ORDER[a.meal_type] || 5) - (MEAL_ORDER[b.meal_type] || 5);
    if (orderDiff !== 0) return orderDiff;
    return (a.created_at || '').localeCompare(b.created_at || '');
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logs: FoodLogWithFood[] = sortedLogs.map((row: any) => ({
    id: row.id,
    food_id: row.food_id,
    date: row.date,
    meal_type: row.meal_type,
    serving_size_id: row.serving_size_id,
    quantity: row.quantity,
    custom_grams: row.custom_grams,
    cal_override: row.cal_override ?? null,
    protein_override: row.protein_override ?? null,
    carbs_override: row.carbs_override ?? null,
    fat_override: row.fat_override ?? null,
    created_at: row.created_at,
    food: row.food,
    serving_size: row.serving_size || null,
  }));

  // Compute daily totals from the daily logs query (uses foods/serving_sizes join)
  // We need to re-query in the format computeTotals expects, or compute from logs
  const dailyTotals = computeTotals(
    (logsResult.data || []).map((row: any) => ({  // eslint-disable-line @typescript-eslint/no-explicit-any
      ...row,
      foods: row.food,
      serving_sizes: row.serving_size,
    })),
    date
  );

  // Process weekly report
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const weeklyLogsByDate = new Map<string, any[]>();
  for (const log of weeklyLogsResult.data || []) {
    const arr = weeklyLogsByDate.get(log.date) || [];
    arr.push(log);
    weeklyLogsByDate.set(log.date, arr);
  }

  const weeklyDays: DailyTotals[] = [];
  const current = new Date(monday);
  for (let i = 0; i < 7; i++) {
    const dayStr = current.toISOString().split('T')[0];
    const dayLogs = weeklyLogsByDate.get(dayStr) || [];
    weeklyDays.push(dayLogs.length > 0 ? computeTotals(dayLogs, dayStr) : zeroTotals(dayStr));
    current.setDate(current.getDate() + 1);
  }

  // Process settings
  const settings: Record<string, string> = {};
  for (const row of settingsResult.data || []) {
    settings[row.key] = row.value;
  }

  return NextResponse.json({
    daily: dailyTotals,
    logs,
    weekly: { startDate, endDate, days: weeklyDays },
    settings,
  });
}
