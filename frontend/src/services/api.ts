import axios from 'axios';
import type {
  Food,
  FoodCreate,
  Recipe,
  RecipeCreate,
  FoodLog,
  FoodLogCreate,
  DailySummary,
  ExternalFood,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Foods API
export const foodsApi = {
  list: async (params?: { search?: string; custom_only?: boolean; favorites_only?: boolean }) => {
    const { data } = await api.get<Food[]>('/foods', { params });
    return data;
  },

  get: async (id: number) => {
    const { data } = await api.get<Food>(`/foods/${id}`);
    return data;
  },

  create: async (food: FoodCreate) => {
    const { data } = await api.post<Food>('/foods', food);
    return data;
  },

  update: async (id: number, food: Partial<FoodCreate>) => {
    const { data } = await api.put<Food>(`/foods/${id}`, food);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/foods/${id}`);
  },
};

// Recipes API
export const recipesApi = {
  list: async (params?: { search?: string }) => {
    const { data } = await api.get<Recipe[]>('/recipes', { params });
    return data;
  },

  get: async (id: number) => {
    const { data } = await api.get<Recipe>(`/recipes/${id}`);
    return data;
  },

  create: async (recipe: RecipeCreate) => {
    const { data } = await api.post<Recipe>('/recipes', recipe);
    return data;
  },

  update: async (id: number, recipe: Partial<RecipeCreate>) => {
    const { data } = await api.put<Recipe>(`/recipes/${id}`, recipe);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/recipes/${id}`);
  },
};

// Food Logs API
export const logsApi = {
  list: async (date: string, meal_type?: string) => {
    const { data } = await api.get<FoodLog[]>('/logs', {
      params: { log_date: date, meal_type },
    });
    return data;
  },

  getSummary: async (date: string) => {
    const { data } = await api.get<DailySummary>('/logs/summary', {
      params: { log_date: date },
    });
    return data;
  },

  create: async (log: FoodLogCreate) => {
    const { data } = await api.post<FoodLog>('/logs', log);
    return data;
  },

  update: async (id: number, log: Partial<FoodLogCreate>) => {
    const { data } = await api.put<FoodLog>(`/logs/${id}`, log);
    return data;
  },

  delete: async (id: number) => {
    await api.delete(`/logs/${id}`);
  },
};

// Nutrition (external search) API
export const nutritionApi = {
  search: async (query: string, source: 'openfoodfacts' | 'usda' = 'openfoodfacts') => {
    const { data } = await api.get<ExternalFood[]>('/nutrition/search', {
      params: { q: query, source },
    });
    return data;
  },

  lookupBarcode: async (barcode: string) => {
    const { data } = await api.get<ExternalFood>(`/nutrition/barcode/${barcode}`);
    return data;
  },
};

export default api;
