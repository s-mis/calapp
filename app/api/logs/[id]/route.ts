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

  const { data: existing } = await supabase
    .from('food_logs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Log entry not found' }, { status: 404 });
  }

  const body = await request.json();
  const { food_id, date, meal_type, serving_size_id, quantity, custom_grams } = body;

  const validMeals = ['breakfast', 'lunch', 'dinner', 'snack'];
  if (meal_type && !validMeals.includes(meal_type)) {
    return NextResponse.json({ error: 'meal_type must be breakfast, lunch, dinner, or snack' }, { status: 400 });
  }

  const { data: log, error } = await supabase
    .from('food_logs')
    .update({
      food_id: food_id ?? existing.food_id,
      date: date ?? existing.date,
      meal_type: meal_type ?? existing.meal_type,
      serving_size_id: serving_size_id !== undefined ? (serving_size_id ?? null) : existing.serving_size_id,
      quantity: quantity ?? existing.quantity,
      custom_grams: custom_grams !== undefined ? (custom_grams ?? null) : existing.custom_grams,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
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

  const { data: existing } = await supabase
    .from('food_logs')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Log entry not found' }, { status: 404 });
  }

  const { error } = await supabase.from('food_logs').delete().eq('id', id).eq('user_id', user.id);
  if (error) {
    console.error('Error deleting log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
