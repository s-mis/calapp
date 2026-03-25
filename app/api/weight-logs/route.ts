import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';

// GET /api/weight-logs?date=YYYY-MM-DD | ?start=...&end=... | ?limit=90
export async function GET(request: NextRequest) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const { searchParams } = request.nextUrl;
  const date = searchParams.get('date');
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const limit = Math.min(parseInt(searchParams.get('limit') || '90', 10) || 90, 365);

  let query = supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', user.id);

  if (date) {
    query = query.eq('date', date);
  } else if (start && end) {
    query = query.gte('date', start).lte('date', end);
  } else {
    query = query.limit(limit);
  }

  query = query.order('date', { ascending: true });

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching weight logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

// POST /api/weight-logs — upserts by (user_id, date)
export async function POST(request: NextRequest) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const body = await request.json();
  const { date, weight, notes } = body;

  if (!date || weight == null) {
    return NextResponse.json({ error: 'date and weight are required' }, { status: 400 });
  }

  if (typeof weight !== 'number' || weight <= 0) {
    return NextResponse.json({ error: 'weight must be a positive number' }, { status: 400 });
  }

  const { data: log, error } = await supabase
    .from('weight_logs')
    .upsert(
      { user_id: user.id, date, weight, notes: notes ?? null },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error creating/updating weight log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json(log, { status: 201 });
}
