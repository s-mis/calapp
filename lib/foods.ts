import type { SupabaseClient } from '@supabase/supabase-js';
import type { FoodWithServingSizes } from '@/types';

export async function getFoodWithServingSizes(
  supabase: SupabaseClient,
  foodId: number
): Promise<FoodWithServingSizes | undefined> {
  const { data } = await supabase
    .from('foods')
    .select('*, serving_sizes(*)')
    .eq('id', foodId)
    .single();
  if (!data) return undefined;
  if (data.serving_sizes) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.serving_sizes.sort((a: any, b: any) => (a.sort_order - b.sort_order) || (a.id - b.id));
  }
  return data as unknown as FoodWithServingSizes;
}
