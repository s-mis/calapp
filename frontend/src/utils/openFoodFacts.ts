import { FoodSaveData } from '../components/AddFoodDialog';

export async function fetchByBarcode(barcode: string): Promise<FoodSaveData | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
  );
  if (!res.ok) return null;

  const data = await res.json();
  if (!data || data.status === 0) return null;

  const p = data.product ?? {};
  const n = p.nutriments ?? {};

  const toVal = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const num = parseFloat(String(v));
    return isNaN(num) ? null : num;
  };

  const serving_sizes: FoodSaveData['serving_sizes'] = [
    { name: '100g', grams: 100, sort_order: 0, is_default: 1 },
  ];

  const servingGrams = toVal(p.serving_quantity);
  const servingLabel = p.serving_size as string | undefined;
  if (servingGrams && servingGrams > 0) {
    serving_sizes.push({
      name: servingLabel || `1 serving (${servingGrams}g)`,
      grams: servingGrams,
      sort_order: 1,
      is_default: 0,
    });
  }

  return {
    name: (p.product_name as string | undefined) || '',
    brand: (p.brands as string | undefined) || null,
    unit: 'g',
    calories: toVal(n['energy-kcal_100g']),
    protein: toVal(n['proteins_100g']),
    carbs: toVal(n['carbohydrates_100g']),
    fat: toVal(n['fat_100g']),
    fiber: toVal(n['fiber_100g']),
    sugar: toVal(n['sugars_100g']),
    saturated_fat: toVal(n['saturated-fat_100g']),
    sodium: toVal(n['sodium_100g']) != null ? (toVal(n['sodium_100g'])! * 1000) : null,
    potassium: toVal(n['potassium_100g']) != null ? (toVal(n['potassium_100g'])! * 1000) : null,
    calcium: toVal(n['calcium_100g']),
    iron: toVal(n['iron_100g']),
    barcode,
    serving_sizes,
  };
}
