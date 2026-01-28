// Food types - all nutritional values are per 100g
export interface Food {
  id: number;
  name: string;
  brand?: string;
  barcode?: string;

  // Optional serving size (e.g., 60g for a protein bar)
  serving_size?: number; // grams per serving/piece
  serving_unit?: string; // e.g., "bar", "egg", "slice"

  // Macros (per 100g)
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;

  // Micros (per 100g)
  sodium: number;
  potassium: number;
  vitamin_a: number;
  vitamin_c: number;
  calcium: number;
  iron: number;
  vitamin_d: number;
  vitamin_e: number;
  vitamin_k: number;
  vitamin_b1: number;
  vitamin_b2: number;
  vitamin_b3: number;
  vitamin_b6: number;
  vitamin_b12: number;
  folate: number;
  magnesium: number;
  zinc: number;
  phosphorus: number;

  // Metadata
  source?: string;
  external_id?: string;
  is_custom: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;

  // Multiple serving size options
  serving_sizes: ServingSize[];
}

export interface ServingSize {
  id: number;
  name: string;
  grams: number;
  display_name?: string;
  is_default: boolean;
}

export interface ServingSizeCreate {
  name: string;
  grams: number;
  display_name?: string;
  sort_order?: number;
  is_default?: boolean;
}

export interface FoodCreate {
  name: string;
  brand?: string;
  barcode?: string;
  serving_size?: number;
  serving_unit?: string;

  // Macros (per 100g)
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;

  // Micros (per 100g) - all optional, default to 0
  sodium?: number;
  potassium?: number;
  vitamin_a?: number;
  vitamin_c?: number;
  calcium?: number;
  iron?: number;
  vitamin_d?: number;
  vitamin_e?: number;
  vitamin_k?: number;
  vitamin_b1?: number;
  vitamin_b2?: number;
  vitamin_b3?: number;
  vitamin_b6?: number;
  vitamin_b12?: number;
  folate?: number;
  magnesium?: number;
  zinc?: number;
  phosphorus?: number;

  source?: string;
  external_id?: string;
  is_custom?: boolean;
  is_favorite?: boolean;

  // Multiple serving sizes
  serving_sizes?: ServingSizeCreate[];
}

export interface FoodUpdate {
  name?: string;
  brand?: string;
  barcode?: string;
  serving_size?: number;
  serving_unit?: string;
  is_favorite?: boolean;

  // Macros
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;

  // Micros
  sodium?: number;
  potassium?: number;
  vitamin_a?: number;
  vitamin_c?: number;
  calcium?: number;
  iron?: number;
  vitamin_d?: number;
  vitamin_e?: number;
  vitamin_k?: number;
  vitamin_b1?: number;
  vitamin_b2?: number;
  vitamin_b3?: number;
  vitamin_b6?: number;
  vitamin_b12?: number;
  folate?: number;
  magnesium?: number;
  zinc?: number;
  phosphorus?: number;
}

// Recipe types
export interface RecipeIngredient {
  id: number;
  food_id: number;
  amount: number; // in grams
  order_index: number;
  food: Food;
}

export interface RecipeIngredientCreate {
  food_id: number;
  amount: number; // in grams
  order_index?: number;
}

export interface NutritionSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  potassium: number;
}

export interface Recipe {
  id: number;
  name: string;
  description?: string;
  servings: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  instructions?: string;
  ingredients: RecipeIngredient[];
  created_at: string;
  updated_at: string;
  total_nutrition?: NutritionSummary;
  per_serving_nutrition?: NutritionSummary;
}

export interface RecipeCreate {
  name: string;
  description?: string;
  servings: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  instructions?: string;
  ingredients: RecipeIngredientCreate[];
}

// Food log types
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodLog {
  id: number;
  log_date: string;
  meal_type?: MealType;
  food_id?: number;
  recipe_id?: number;
  amount: number; // in grams
  logged_at: string;
  food?: Food;
  recipe?: Recipe;
  // Calculated nutrition for this entry
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface FoodLogCreate {
  log_date: string;
  meal_type?: MealType;
  food_id?: number;
  recipe_id?: number;
  amount: number; // in grams
}

export interface DailySummary {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  total_sugar: number;
  total_sodium: number;
  entries_count: number;
  breakfast_calories: number;
  lunch_calories: number;
  dinner_calories: number;
  snack_calories: number;
}

// External food search result
export interface ExternalFood {
  external_id: string;
  source: string;
  name: string;
  brand?: string;
  barcode?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}
