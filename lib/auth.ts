import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from './supabase/server';
import type { User } from '@supabase/supabase-js';

// Cache validated tokens for 60s to avoid repeated Supabase Auth roundtrips
const tokenCache = new Map<string, { user: User; ts: number }>();
const CACHE_TTL = 60_000;

// Evict stale entries periodically (max 200 entries)
function pruneCache() {
  if (tokenCache.size < 200) return;
  const now = Date.now();
  for (const [k, v] of tokenCache) {
    if (now - v.ts > CACHE_TTL) tokenCache.delete(k);
  }
}

export async function validateAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const token = authHeader.slice(7);

  // Check cache first
  const cached = tokenCache.get(token);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    const supabase = getServerSupabase(token);
    return { user: cached.user, supabase };
  }

  const supabase = getServerSupabase(token);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    tokenCache.delete(token);
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  pruneCache();
  tokenCache.set(token, { user, ts: Date.now() });
  return { user, supabase };
}
