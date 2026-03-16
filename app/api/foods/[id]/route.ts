import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { getFoodWithServingSizes } from '@/lib/foods';

// GET /api/foods/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { supabase } = auth;

  const { id } = await params;
  const food = await getFoodWithServingSizes(supabase, Number(id));
  if (!food) {
    return NextResponse.json({ error: 'Food not found' }, { status: 404 });
  }
  return NextResponse.json(food);
}

// PUT /api/foods/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { supabase } = auth;

  const { id } = await params;
  const foodId = Number(id);

  const { data: existing } = await supabase.from('foods').select('id').eq('id', foodId).single();
  if (!existing) {
    return NextResponse.json({ error: 'Food not found' }, { status: 404 });
  }

  const body = await request.json();
  const {
    name, brand, unit,
    calories, protein, carbs, fat, fiber, sugar, saturated_fat, trans_fat, cholesterol,
    sodium, potassium, calcium, iron,
    vitamin_a, vitamin_c, vitamin_d, vitamin_e, vitamin_k,
    vitamin_b6, vitamin_b12, folate,
    magnesium, zinc, phosphorus,
    barcode,
    serving_sizes,
  } = body;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const foodUnit = unit === 'ml' ? 'ml' : 'g';

  const { error: updateError } = await supabase
    .from('foods')
    .update({
      name, brand: brand ?? null, unit: foodUnit,
      calories: calories ?? null, protein: protein ?? null, carbs: carbs ?? null,
      fat: fat ?? null, fiber: fiber ?? null, sugar: sugar ?? null,
      saturated_fat: saturated_fat ?? null, trans_fat: trans_fat ?? null, cholesterol: cholesterol ?? null,
      sodium: sodium ?? null, potassium: potassium ?? null, calcium: calcium ?? null, iron: iron ?? null,
      vitamin_a: vitamin_a ?? null, vitamin_c: vitamin_c ?? null, vitamin_d: vitamin_d ?? null,
      vitamin_e: vitamin_e ?? null, vitamin_k: vitamin_k ?? null,
      vitamin_b6: vitamin_b6 ?? null, vitamin_b12: vitamin_b12 ?? null, folate: folate ?? null,
      magnesium: magnesium ?? null, zinc: zinc ?? null, phosphorus: phosphorus ?? null,
      barcode: barcode ?? null,
    })
    .eq('id', foodId);

  if (updateError) {
    console.error('Error updating food:', updateError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Update serving sizes if provided
  if (Array.isArray(serving_sizes)) {
    const { data: existingSizes } = await supabase
      .from('serving_sizes')
      .select('id, grams')
      .eq('food_id', foodId);

    const existingIds = new Set((existingSizes || []).map((s: { id: number }) => s.id));
    const incomingIds = new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      serving_sizes.filter((s: any) => s.id).map((s: any) => s.id as number)
    );

    // For removed serving sizes, preserve food_log data
    for (const old of existingSizes || []) {
      if (!incomingIds.has(old.id)) {
        const { data: affectedLogs } = await supabase
          .from('food_logs')
          .select('id, quantity')
          .eq('serving_size_id', old.id);

        for (const log of affectedLogs || []) {
          await supabase
            .from('food_logs')
            .update({ custom_grams: old.grams * log.quantity, serving_size_id: null })
            .eq('id', log.id);
        }

        await supabase.from('serving_sizes').delete().eq('id', old.id);
      }
    }

    // Update existing and insert new
    for (let i = 0; i < serving_sizes.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = serving_sizes[i] as any;
      if (s.id && existingIds.has(s.id)) {
        await supabase
          .from('serving_sizes')
          .update({
            name: s.name,
            grams: s.grams,
            sort_order: s.sort_order ?? i,
            is_default: s.is_default ? 1 : 0,
          })
          .eq('id', s.id);
      } else {
        await supabase
          .from('serving_sizes')
          .insert({
            food_id: foodId,
            name: s.name,
            grams: s.grams,
            sort_order: s.sort_order ?? i,
            is_default: s.is_default ? 1 : 0,
          });
      }
    }

    // Ensure there's always a default
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasDefault = serving_sizes.some((s: any) => s.is_default);
    if (!hasDefault) {
      const { data: defaultCheck } = await supabase
        .from('serving_sizes')
        .select('id')
        .eq('food_id', foodId)
        .eq('is_default', 1)
        .limit(1);

      if (!defaultCheck || defaultCheck.length === 0) {
        await supabase
          .from('serving_sizes')
          .insert({ food_id: foodId, name: `100${foodUnit}`, grams: 100, sort_order: 0, is_default: 1 });
      }
    }
  }

  const result = await getFoodWithServingSizes(supabase, foodId);
  return NextResponse.json(result);
}

// DELETE /api/foods/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { supabase } = auth;

  const { id } = await params;

  const { data: existing } = await supabase.from('foods').select('id').eq('id', id).single();
  if (!existing) {
    return NextResponse.json({ error: 'Food not found' }, { status: 404 });
  }

  const { error } = await supabase.from('foods').delete().eq('id', id);
  if (error) {
    console.error('Error deleting food:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
