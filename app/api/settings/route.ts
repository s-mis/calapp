import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';

// GET /api/settings
export async function GET(request: NextRequest) {
  const auth = await validateAuth(request);
  if ('error' in auth) return auth.error;
  const { supabase } = auth;

  const { data, error } = await supabase.from('settings').select('key, value');
  if (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  const settings: Record<string, string> = {};
  for (const row of data || []) {
    settings[row.key] = row.value;
  }

  return NextResponse.json(settings);
}
