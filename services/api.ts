import { Food, FoodLogWithFood, FoodLog, DailyTotals, WeeklyReport, MonthlyReport } from '@/types';
import { supabase } from '@/lib/supabase/client';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
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
export const getFoods = (search?: string, barcode?: string) => {
  const params = new URLSearchParams();
  if (barcode) params.set('barcode', barcode);
  else if (search) params.set('search', search);
  const qs = params.toString();
  return request<Food[]>(`/foods${qs ? `?${qs}` : ''}`);
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
}) =>
  request<FoodLog>('/logs', { method: 'POST', body: JSON.stringify(log) });

export const updateLog = (id: number, log: Partial<FoodLog>) =>
  request<FoodLog>(`/logs/${id}`, { method: 'PUT', body: JSON.stringify(log) });

export const deleteLog = (id: number) =>
  request<void>(`/logs/${id}`, { method: 'DELETE' });

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
