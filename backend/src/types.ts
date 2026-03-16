export interface Food {
  id: number;
  name: string;
  brand: string | null;
  unit: 'g' | 'ml';
  // Macros (per 100g/100ml)
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  saturated_fat: number | null;
  trans_fat: number | null;
  cholesterol: number | null;
  // Micros (per 100g/100ml)
  sodium: number | null;
  potassium: number | null;
  calcium: number | null;
  iron: number | null;
  vitamin_a: number | null;
  vitamin_c: number | null;
  vitamin_d: number | null;
  vitamin_e: number | null;
  vitamin_k: number | null;
  vitamin_b6: number | null;
  vitamin_b12: number | null;
  folate: number | null;
  magnesium: number | null;
  zinc: number | null;
  phosphorus: number | null;
  barcode: string | null;
  // Meta
  created_at: string;
}

export interface ServingSize {
  id: number;
  food_id: number;
  name: string;
  grams: number;
  sort_order: number;
  is_default: number;
}

export interface FoodWithServingSizes extends Food {
  serving_sizes: ServingSize[];
}

export interface FoodLog {
  id: number;
  food_id: number;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  serving_size_id: number | null;
  quantity: number;
  custom_grams: number | null;
  created_at: string;
}

export interface FoodLogWithFood extends FoodLog {
  food: Food;
  serving_size: ServingSize | null;
}

export interface DailyTotals {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  saturated_fat: number;
  trans_fat: number;
  cholesterol: number;
  sodium: number;
  potassium: number;
  calcium: number;
  iron: number;
  vitamin_a: number;
  vitamin_c: number;
  vitamin_d: number;
  vitamin_e: number;
  vitamin_k: number;
  vitamin_b6: number;
  vitamin_b12: number;
  folate: number;
  magnesium: number;
  zinc: number;
  phosphorus: number;
  entry_count: number;
}
