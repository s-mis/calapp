import type { FoodSaveData } from '@/components/AddFoodDialog';

const toVal = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const num = parseFloat(String(v));
  return isNaN(num) ? null : num;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapProductToFoodSaveData(p: any, barcode?: string): FoodSaveData {
  const n = p.nutriments ?? {};

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
    brand: (Array.isArray(p.brands) ? p.brands.join(', ') : p.brands as string | undefined) || null,
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
    barcode: barcode ?? (p.code as string | undefined) ?? null,
    serving_sizes,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const OFF_HEADERS = {
  'User-Agent': 'CalApp/1.0 (https://github.com/user/calapp)',
};

export async function fetchByBarcode(barcode: string): Promise<FoodSaveData | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
    { headers: OFF_HEADERS }
  );
  if (!res.ok) return null;

  const data = await res.json();
  if (!data || data.status === 0) return null;

  return mapProductToFoodSaveData(data.product ?? {}, barcode);
}

export type OFFSearchResult = FoodSaveData & { image_url?: string | null };

export async function searchByText(query: string): Promise<OFFSearchResult[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch('/api/off-search', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: query.trim(),
        index_id: 'off',
        langs: ['en'],
        page_size: 10,
        fields: [
          'code', 'product_name', 'brands',
          'serving_size', 'serving_quantity', 'nutriments',
          'image_front_small_url',
        ],
      }),
    });
    if (!res.ok) throw new Error(`OFF_${res.status}`);

    const data = await res.json();
    const hits = data.hits ?? [];

    return hits
      .map((p: Record<string, unknown>) => ({
        ...mapProductToFoodSaveData(p),
        image_url: (p.image_front_small_url as string | undefined) || null,
      }))
      .filter((f: OFFSearchResult) => f.name && f.name.trim().length > 0);
  } finally {
    clearTimeout(timeout);
  }
}
