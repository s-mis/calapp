import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';

// PUT /api/logs/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const { id } = await params;

  const body = await request.json();
  const { food_id, date, meal_type, serving_size_id, quantity, custom_grams,
    cal_override, protein_override, carbs_override, fat_override } = body;

  const validMeals = ['breakfast', 'lunch', 'dinner', 'snack'];
  if (meal_type && !validMeals.includes(meal_type)) {
    return NextResponse.json({ error: 'meal_type must be breakfast, lunch, dinner, or snack' }, { status: 400 });
  }

  // Build update with only provided fields — no need for a separate SELECT
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  if (food_id !== undefined) updates.food_id = food_id;
  if (date !== undefined) updates.date = date;
  if (meal_type !== undefined) updates.meal_type = meal_type;
  if (serving_size_id !== undefined) updates.serving_size_id = serving_size_id ?? null;
  if (quantity !== undefined) updates.quantity = quantity;
  if (custom_grams !== undefined) updates.custom_grams = custom_grams ?? null;
  if (cal_override !== undefined) updates.cal_override = cal_override ?? null;
  if (protein_override !== undefined) updates.protein_override = protein_override ?? null;
  if (carbs_override !== undefined) updates.carbs_override = carbs_override ?? null;
  if (fat_override !== undefined) updates.fat_override = fat_override ?? null;

  const { data: log, error } = await supabase
    .from('food_logs')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Log entry not found' }, { status: 404 });
    }
    console.error('Error updating log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json(log);
}

// DELETE /api/logs/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const { id } = await params;

  // Single query: delete and return deleted row to verify existence
  const { data, error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id');

  if (error) {
    console.error('Error deleting log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Log entry not found' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
