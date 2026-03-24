import type { DailyTotals } from '@/types';

export const NUTRIENT_FIELDS = [
  'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar',
  'saturated_fat', 'trans_fat', 'cholesterol',
  'sodium', 'potassium', 'calcium', 'iron',
  'vitamin_a', 'vitamin_c', 'vitamin_d', 'vitamin_e', 'vitamin_k',
  'vitamin_b6', 'vitamin_b12', 'folate',
  'magnesium', 'zinc', 'phosphorus',
] as const;

export function zeroTotals(date: string): DailyTotals {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totals: any = { date, entry_count: 0 };
  for (const f of NUTRIENT_FIELDS) totals[f] = 0;
  return totals as DailyTotals;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function computeTotals(logs: any[], date: string): DailyTotals {
  const totals = zeroTotals(date);
  totals.entry_count = logs.length;

  for (const log of logs) {
    // Override path: absolute values stored directly on the log entry
    if (log.cal_override != null) {
      totals.calories += log.cal_override;
      totals.protein += log.protein_override || 0;
      totals.carbs += log.carbs_override || 0;
      totals.fat += log.fat_override || 0;
      continue;
    }

    const food = log.foods;
    if (!food) continue;

    const mult = log.serving_size_id && log.serving_sizes
      ? (log.serving_sizes.grams * log.quantity) / 100
      : ((log.custom_grams || 0) * log.quantity) / 100;

    for (const f of NUTRIENT_FIELDS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (totals as any)[f] += ((food as any)[f] || 0) * mult;
    }
  }
  return totals;
}
