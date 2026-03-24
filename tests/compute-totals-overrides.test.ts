/**
 * Direct unit test for computeTotals with override columns.
 * Run with: npx tsx tests/compute-totals-overrides.test.ts
 */

// Inline the function to avoid module resolution issues
const NUTRIENT_FIELDS = [
  'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar',
  'saturated_fat', 'trans_fat', 'cholesterol',
  'sodium', 'potassium', 'calcium', 'iron',
  'vitamin_a', 'vitamin_c', 'vitamin_d', 'vitamin_e', 'vitamin_k',
  'vitamin_b6', 'vitamin_b12', 'folate',
  'magnesium', 'zinc', 'phosphorus',
] as const;

function zeroTotals(date: string) {
  const totals: Record<string, number | string> = { date, entry_count: 0 };
  for (const f of NUTRIENT_FIELDS) totals[f] = 0;
  return totals;
}

function computeTotals(logs: any[], date: string) {
  const totals = zeroTotals(date);
  totals.entry_count = logs.length;

  for (const log of logs) {
    if (log.cal_override != null) {
      (totals as any).calories += log.cal_override;
      (totals as any).protein += log.protein_override || 0;
      (totals as any).carbs += log.carbs_override || 0;
      (totals as any).fat += log.fat_override || 0;
      continue;
    }

    const food = log.foods;
    if (!food) continue;

    const mult = log.serving_size_id && log.serving_sizes
      ? (log.serving_sizes.grams * log.quantity) / 100
      : ((log.custom_grams || 0) * log.quantity) / 100;

    for (const f of NUTRIENT_FIELDS) {
      (totals as any)[f] += ((food as any)[f] || 0) * mult;
    }
  }
  return totals;
}

// ── Tests ──
let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${msg}`);
  } else {
    failed++;
    console.error(`  FAIL: ${msg}`);
  }
}

function assertClose(actual: number, expected: number, msg: string, tolerance = 0.01) {
  assert(Math.abs(actual - expected) < tolerance, `${msg} (got ${actual}, expected ${expected})`);
}

console.log('\n=== computeTotals override tests ===\n');

// Test 1: Override-only entry
console.log('Test 1: Override entry uses absolute values');
{
  const logs = [{
    cal_override: 600,
    protein_override: 30,
    carbs_override: 50,
    fat_override: 25,
    foods: { calories: 0, protein: 0, carbs: 0, fat: 0 }, // sentinel food
    serving_size_id: null,
    serving_sizes: null,
    custom_grams: null,
    quantity: 1,
  }];
  const t = computeTotals(logs, '2024-01-01');
  assertClose(t.calories as number, 600, 'calories = 600');
  assertClose(t.protein as number, 30, 'protein = 30');
  assertClose(t.carbs as number, 50, 'carbs = 50');
  assertClose(t.fat as number, 25, 'fat = 25');
  assert(t.entry_count === 1, 'entry_count = 1');
}

// Test 2: Regular food entry (no overrides)
console.log('\nTest 2: Regular entry uses food-based calculation');
{
  const logs = [{
    cal_override: null,
    protein_override: null,
    carbs_override: null,
    fat_override: null,
    foods: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, saturated_fat: 1, trans_fat: 0, cholesterol: 85, sodium: 74, potassium: 256, calcium: 11, iron: 0.7, vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0, vitamin_k: 0, vitamin_b6: 0.6, vitamin_b12: 0.3, folate: 4, magnesium: 29, zinc: 0.9, phosphorus: 228 },
    serving_size_id: 1,
    serving_sizes: { grams: 100 },
    custom_grams: null,
    quantity: 1,
  }];
  const t = computeTotals(logs, '2024-01-01');
  assertClose(t.calories as number, 165, 'calories = 165');
  assertClose(t.protein as number, 31, 'protein = 31');
  assertClose(t.fat as number, 3.6, 'fat = 3.6');
}

// Test 3: Mixed — override + regular
console.log('\nTest 3: Mixed override + regular entries');
{
  const logs = [
    {
      cal_override: 400,
      protein_override: 20,
      carbs_override: 40,
      fat_override: 15,
      foods: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      serving_size_id: null,
      serving_sizes: null,
      custom_grams: null,
      quantity: 1,
    },
    {
      cal_override: null,
      protein_override: null,
      carbs_override: null,
      fat_override: null,
      foods: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, saturated_fat: 1, trans_fat: 0, cholesterol: 85, sodium: 74, potassium: 256, calcium: 11, iron: 0.7, vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0, vitamin_k: 0, vitamin_b6: 0.6, vitamin_b12: 0.3, folate: 4, magnesium: 29, zinc: 0.9, phosphorus: 228 },
      serving_size_id: 1,
      serving_sizes: { grams: 100 },
      custom_grams: null,
      quantity: 1,
    },
  ];
  const t = computeTotals(logs, '2024-01-01');
  assertClose(t.calories as number, 565, 'calories = 400 + 165 = 565');
  assertClose(t.protein as number, 51, 'protein = 20 + 31 = 51');
  assertClose(t.fat as number, 18.6, 'fat = 15 + 3.6 = 18.6');
  assert(t.entry_count === 2, 'entry_count = 2');
}

// Test 4: Override with zero macros (only calories)
console.log('\nTest 4: Override with only calories, zero macros');
{
  const logs = [{
    cal_override: 200,
    protein_override: 0,
    carbs_override: 0,
    fat_override: 0,
    foods: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    serving_size_id: null,
    serving_sizes: null,
    custom_grams: null,
    quantity: 1,
  }];
  const t = computeTotals(logs, '2024-01-01');
  assertClose(t.calories as number, 200, 'calories = 200');
  assertClose(t.protein as number, 0, 'protein = 0');
  assertClose(t.carbs as number, 0, 'carbs = 0');
  assertClose(t.fat as number, 0, 'fat = 0');
}

// Test 5: Multiple override entries
console.log('\nTest 5: Multiple override entries sum correctly');
{
  const logs = [
    { cal_override: 300, protein_override: 15, carbs_override: 30, fat_override: 10, foods: { calories: 0 }, serving_size_id: null, serving_sizes: null, custom_grams: null, quantity: 1 },
    { cal_override: 450, protein_override: 25, carbs_override: 40, fat_override: 20, foods: { calories: 0 }, serving_size_id: null, serving_sizes: null, custom_grams: null, quantity: 1 },
  ];
  const t = computeTotals(logs, '2024-01-01');
  assertClose(t.calories as number, 750, 'calories = 300 + 450 = 750');
  assertClose(t.protein as number, 40, 'protein = 15 + 25 = 40');
  assertClose(t.carbs as number, 70, 'carbs = 30 + 40 = 70');
  assertClose(t.fat as number, 30, 'fat = 10 + 20 = 30');
}

// Test 6: Override entry ignores sentinel food values (does NOT multiply)
console.log('\nTest 6: Override entry ignores food values entirely');
{
  // Even if the sentinel food had non-zero values, overrides should be used directly
  const logs = [{
    cal_override: 500,
    protein_override: 25,
    carbs_override: 50,
    fat_override: 20,
    foods: { calories: 999, protein: 999, carbs: 999, fat: 999 },
    serving_size_id: null,
    serving_sizes: null,
    custom_grams: 100,
    quantity: 1,
  }];
  const t = computeTotals(logs, '2024-01-01');
  assertClose(t.calories as number, 500, 'calories = 500 (not 999)');
  assertClose(t.protein as number, 25, 'protein = 25 (not 999)');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
