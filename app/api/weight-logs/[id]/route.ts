import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';

// PUT /api/weight-logs/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const { id } = await params;

  const { data: existing } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Weight log not found' }, { status: 404 });
  }

  const body = await request.json();
  const { weight, notes, date } = body;

  const { data: log, error } = await supabase
    .from('weight_logs')
    .update({
      weight: weight ?? existing.weight,
      notes: notes !== undefined ? (notes ?? null) : existing.notes,
      date: date ?? existing.date,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating weight log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json(log);
}

// DELETE /api/weight-logs/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const { id } = await params;

  const { data: existing } = await supabase
    .from('weight_logs')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Weight log not found' }, { status: 404 });
  }

  const { error } = await supabase.from('weight_logs').delete().eq('id', id).eq('user_id', user.id);
  if (error) {
    console.error('Error deleting weight log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
