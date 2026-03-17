import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';

// PUT /api/settings/:key
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  const { key } = await params;
  const body = await request.json();
  const { value } = body;

  if (value === undefined || value === null) {
    return NextResponse.json({ error: 'value is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('settings')
    .upsert({ user_id: user.id, key, value: String(value) });

  if (error) {
    console.error('Error updating setting:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json({ key, value: String(value) });
}
