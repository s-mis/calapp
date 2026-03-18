import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { getFoodWithServingSizes } from '@/lib/foods';

// GET /api/foods - list all foods (with optional search or barcode filter)
export async function GET(request: NextRequest) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { supabase } = auth;

  const { searchParams } = request.nextUrl;
  const search = searchParams.get('search');
  const barcode = searchParams.get('barcode');
  const sort = searchParams.get('sort') || 'name';
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

  let query = supabase.from('foods').select('*, serving_sizes(*)', { count: 'exact' });

  if (barcode) {
    query = query.eq('barcode', barcode);
  } else if (search) {
    const pattern = `%${search}%`;
    query = query.or(`name.ilike.${pattern},brand.ilike.${pattern}`);
  }

  // Apply sort
  switch (sort) {
    case 'calories_asc':
      query = query.order('calories', { ascending: true, nullsFirst: false });
      break;
    case 'calories_desc':
      query = query.order('calories', { ascending: false, nullsFirst: false });
      break;
    case 'protein_desc':
      query = query.order('protein', { ascending: false, nullsFirst: false });
      break;
    case 'recent':
      query = query.order('created_at', { ascending: false });
      break;
    default:
      query = query.order('name');
  }

  const { data: foods, error, count } = await query
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching foods:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (foods || []).map((f: any) => {
    if (f.serving_sizes) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      f.serving_sizes.sort((a: any, b: any) => (a.sort_order - b.sort_order) || (a.id - b.id));
    }
    return f;
  });

  return NextResponse.json({ data: result, total: count ?? result.length });
}

// POST /api/foods - create food
export async function POST(request: NextRequest) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { supabase } = auth;

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

  const { data: food, error: foodError } = await supabase
    .from('foods')
    .insert({
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
    .select()
    .single();

  if (foodError || !food) {
    console.error('Error creating food:', foodError);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  const foodId = food.id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sizes: Array<{ name: string; grams: number; sort_order?: number; is_default?: number }> =
    Array.isArray(serving_sizes) ? serving_sizes : [];

  const hasDefault = sizes.some(s => s.is_default);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toInsert: any[] = [];

  if (!hasDefault) {
    toInsert.push({ food_id: foodId, name: `100${foodUnit}`, grams: 100, sort_order: 0, is_default: 1 });
  }

  for (let i = 0; i < sizes.length; i++) {
    const s = sizes[i];
    toInsert.push({
      food_id: foodId,
      name: s.name,
      grams: s.grams,
      sort_order: s.sort_order ?? i + 1,
      is_default: s.is_default ? 1 : 0,
    });
  }

  if (toInsert.length > 0) {
    const { error: ssError } = await supabase.from('serving_sizes').insert(toInsert);
    if (ssError) {
      console.error('Error creating serving sizes:', ssError);
    }
  }

  const result = await getFoodWithServingSizes(supabase, foodId);
  return NextResponse.json(result, { status: 201 });
}
