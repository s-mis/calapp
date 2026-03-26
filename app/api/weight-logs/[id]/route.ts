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

  const body = await request.json();
  const { weight, notes, date } = body;

  // Build update with only provided fields — no separate SELECT needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  if (weight !== undefined) updates.weight = weight;
  if (notes !== undefined) updates.notes = notes ?? null;
  if (date !== undefined) updates.date = date;

  const { data: log, error } = await supabase
    .from('weight_logs')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Weight log not found' }, { status: 404 });
    }
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

  const { data, error } = await supabase
    .from('weight_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id');

  if (error) {
    console.error('Error deleting weight log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Weight log not found' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
