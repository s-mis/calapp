import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from './supabase/server';

export async function validateAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const token = authHeader.slice(7);
  const supabase = getServerSupabase(token);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { user, supabase };
}
