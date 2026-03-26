import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import type { FoodLogWithFood } from '@/types';

const MEAL_ORDER: Record<string, number> = { breakfast: 1, lunch: 2, dinner: 3, snack: 4 };

// GET /api/logs?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const date = request.nextUrl.searchParams.get('date');
  if (!date) {
    return NextResponse.json({ error: 'date query parameter is required (YYYY-MM-DD)' }, { status: 400 });
  }

  const { data: logs, error } = await supabase
    .from('food_logs')
    .select('*, food:foods!inner(*), serving_size:serving_sizes(*)')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('created_at');

  if (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sorted = (logs || []).sort((a: any, b: any) => {
    const orderDiff = (MEAL_ORDER[a.meal_type] || 5) - (MEAL_ORDER[b.meal_type] || 5);
    if (orderDiff !== 0) return orderDiff;
    return (a.created_at || '').localeCompare(b.created_at || '');
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: FoodLogWithFood[] = sorted.map((row: any) => ({
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

  return NextResponse.json(result);
}

// POST /api/logs
export async function POST(request: NextRequest) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const body = await request.json();
  const { food_id, date, meal_type, serving_size_id, quantity, custom_grams,
    cal_override, protein_override, carbs_override, fat_override } = body;

  if (!food_id || !date || !meal_type) {
    return NextResponse.json({ error: 'food_id, date, and meal_type are required' }, { status: 400 });
  }

  const validMeals = ['breakfast', 'lunch', 'dinner', 'snack'];
  if (!validMeals.includes(meal_type)) {
    return NextResponse.json({ error: 'meal_type must be breakfast, lunch, dinner, or snack' }, { status: 400 });
  }

  const hasOverrides = cal_override != null;
  if (!hasOverrides && !serving_size_id && custom_grams == null) {
    return NextResponse.json({ error: 'Either serving_size_id or custom_grams must be provided' }, { status: 400 });
  }

  // FK constraint on food_id ensures food exists; skip separate validation query
  const { data: log, error } = await supabase
    .from('food_logs')
    .insert({
      user_id: user.id,
      food_id,
      date,
      meal_type,
      serving_size_id: serving_size_id ?? null,
      quantity: quantity ?? 1,
      custom_grams: custom_grams ?? null,
      cal_override: cal_override ?? null,
      protein_override: protein_override ?? null,
      carbs_override: carbs_override ?? null,
      fat_override: fat_override ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json(log, { status: 201 });
}
