import { Food, FoodLogWithFood, FoodLog, DailyTotals, WeeklyReport, MonthlyReport, PaginatedResponse, WeightLog } from '@/types';
import { supabase } from '@/lib/supabase/client';

// Cache the access token to avoid repeated getSession() calls
let cachedToken: string | null = null;
let tokenSetAt = 0;
const TOKEN_CACHE_MS = 30_000; // refresh every 30s

async function getToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && now - tokenSetAt < TOKEN_CACHE_MS) return cachedToken;
  const { data: { session } } = await supabase.auth.getSession();
  cachedToken = session?.access_token ?? null;
  tokenSetAt = now;
  return cachedToken;
}

// Listen for auth changes to invalidate cache
supabase.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token ?? null;
  tokenSetAt = Date.now();
});

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`/api${url}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Foods
export const getFoods = (search?: string, barcode?: string, limit?: number, offset?: number, sort?: string) => {
  const params = new URLSearchParams();
  if (barcode) params.set('barcode', barcode);
  else if (search) params.set('search', search);
  if (limit != null) params.set('limit', String(limit));
  if (offset != null) params.set('offset', String(offset));
  if (sort) params.set('sort', sort);
  const qs = params.toString();
  return request<PaginatedResponse<Food>>(`/foods${qs ? `?${qs}` : ''}`);
};

export const getFood = (id: number) =>
  request<Food>(`/foods/${id}`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createFood = (food: Record<string, any>) =>
  request<Food>('/foods', { method: 'POST', body: JSON.stringify(food) });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateFood = (id: number, food: Record<string, any>) =>
  request<Food>(`/foods/${id}`, { method: 'PUT', body: JSON.stringify(food) });

export const deleteFood = (id: number) =>
  request<void>(`/foods/${id}`, { method: 'DELETE' });

// Food Logs
export const getLogs = (date: string) =>
  request<FoodLogWithFood[]>(`/logs?date=${date}`);

export const createLog = (log: {
  food_id: number;
  date: string;
  meal_type: string;
  serving_size_id?: number | null;
  quantity: number;
  custom_grams?: number | null;
  cal_override?: number | null;
  protein_override?: number | null;
  carbs_override?: number | null;
  fat_override?: number | null;
}) =>
  request<FoodLog>('/logs', { method: 'POST', body: JSON.stringify(log) });

export const updateLog = (id: number, log: Partial<FoodLog>) =>
  request<FoodLog>(`/logs/${id}`, { method: 'PUT', body: JSON.stringify(log) });

export const deleteLog = (id: number) =>
  request<void>(`/logs/${id}`, { method: 'DELETE' });

export const getRecentFoods = () =>
  request<Food[]>('/logs/recent-foods');

// Dashboard (combined endpoint)
export const getDashboard = (date: string) =>
  request<{ daily: DailyTotals; logs: FoodLogWithFood[]; weekly: WeeklyReport; settings: Record<string, string>; recentWeights: WeightLog[] }>(`/dashboard?date=${date}`);

// Reports
export const getDailyReport = (date: string) =>
  request<DailyTotals>(`/reports/daily?date=${date}`);

export const getWeeklyReport = (date: string) =>
  request<WeeklyReport>(`/reports/weekly?date=${date}`);

export const getMonthlyReport = (month: string) =>
  request<MonthlyReport>(`/reports/monthly?month=${month}`);

// Settings
export const getSettings = () =>
  request<Record<string, string>>('/settings');

export const updateSetting = (key: string, value: string) =>
  request<{ key: string; value: string }>(`/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) });

// Weight Logs
export const getWeightLogs = (params?: { date?: string; start?: string; end?: string; limit?: number }) => {
  const qs = new URLSearchParams();
  if (params?.date) qs.set('date', params.date);
  if (params?.start) qs.set('start', params.start);
  if (params?.end) qs.set('end', params.end);
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const str = qs.toString();
  return request<WeightLog[]>(`/weight-logs${str ? `?${str}` : ''}`);
};

export const createWeightLog = (log: { date: string; weight: number; notes?: string | null }) =>
  request<WeightLog>('/weight-logs', { method: 'POST', body: JSON.stringify(log) });

export const updateWeightLog = (id: number, log: Partial<{ weight: number; notes: string | null; date: string }>) =>
  request<WeightLog>(`/weight-logs/${id}`, { method: 'PUT', body: JSON.stringify(log) });

export const deleteWeightLog = (id: number) =>
  request<void>(`/weight-logs/${id}`, { method: 'DELETE' });
